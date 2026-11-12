import { compactVerify, importJWK } from 'jose';
import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { getDb } from './db/repo';
import { recordDecision, hasDecisionBeenUsed } from './state';

const JWSPayloadSchema = z.object({
  lab_id: z.string(),
  report_id: z.string(),
  order_id: z.string(),
  lot_number: z.string(),
  seal_number: z.string().optional(),
  commodity: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.string(),
  })),
  issue_time: z.string(),
});

export interface LabRegistryEntry {
  kid: string;
  publicKeyPem: string;
}

export interface ExtractedLabData {
  labName: string;
  lotNumber: string;
  reportDate: string;
  parameters: Array<{ name: string; value: number; unit: string; snippet: string }>;
  containsInstructions: boolean;
}

export interface VerificationResult {
  path: 'SIGNED' | 'UNSIGNED';
  result: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  values: any;
  snippetChecks?: Array<{ parameter: string; passed: boolean }>;
  injectionDetected?: boolean;
}

const WHITELISTED_UNITS: Record<string, string[]> = {
  '%': ['%', 'percent', 'pct'],
  'ppm': ['ppm', 'mg/kg', 'mg per kg'],
  'mg/kg': ['mg/kg', 'ppm', 'mg per kg'],
};

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(WHITELISTED_UNITS)) {
    if (aliases.includes(lower)) return canonical;
  }
  return lower;
}

function unitsMatch(expected: string, actual: string): boolean {
  return normalizeUnit(expected) === normalizeUnit(actual);
}

function checkValue(limit: { max?: number; min?: number; unit: string }, value: number, valueUnit: string): boolean {
  if (!unitsMatch(limit.unit, valueUnit)) return false;
  if (limit.max !== undefined && new Decimal(value).gt(limit.max)) return false;
  if (limit.min !== undefined && new Decimal(value).lt(limit.min)) return false;
  return true;
}

function detectInjection(text: string): boolean {
  const patterns = [
    /ignore\s+(previous|above|all)\s+(instructions|prompts|rules)/i,
    /system\s*:\s*you\s+are/i,
    /forget\s+(everything|all)\s+(above|before)/i,
    /you\s+are\s+(an?\s+)?(ai|assistant|bot)/i,
    /<system>/i,
    /<instruction>/i,
    /output\s+only/i,
    /do\s+not\s+(show|tell|reveal)/i,
    /secret|password|key|token/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function checkSnippetInText(fullText: string, snippet: string, value: number): boolean {
  const cleanSnippet = snippet.trim().replace(/\s+/g, ' ');
  const cleanText = fullText.replace(/\s+/g, ' ');
  if (!cleanText.includes(cleanSnippet)) return false;
  const valueStr = value.toString();
  return cleanSnippet.includes(valueStr);
}

function parseRegistryKeys(registryJson: string): Map<string, LabRegistryEntry> {
  try {
    const parsed = JSON.parse(registryJson);
    const map = new Map<string, LabRegistryEntry>();
    for (const [kid, pem] of Object.entries(parsed)) {
      map.set(kid, { kid, publicKeyPem: pem as string });
    }
    return map;
  } catch {
    return new Map();
  }
}

const LAB_REGISTRY = parseRegistryKeys(process.env.LAB_REGISTRY_PUBLIC_KEYS || '{}');

export async function verifySignedJWS(payload: string, orderId: number, lotNumber: string, sealNumber?: string): Promise<VerificationResult> {
  try {
    const parts = payload.split('.');
    if (parts.length !== 3) {
      return { path: 'SIGNED', result: 'INCONCLUSIVE', values: { error: 'Invalid JWS format' } };
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const kid = header.kid;
    const alg = header.alg;

    if (!kid || !LAB_REGISTRY.has(kid)) {
      return { path: 'SIGNED', result: 'INCONCLUSIVE', values: { error: `Unknown kid: ${kid}` } };
    }
    if (alg !== 'EdDSA') {
      return { path: 'SIGNED', result: 'INCONCLUSIVE', values: { error: `Unsupported alg: ${alg}` } };
    }

    const registryEntry = LAB_REGISTRY.get(kid)!;
    const publicKey = await importJWK(
      { kty: 'OKP', crv: 'Ed25519', x: registryEntry.publicKeyPem },
      'EdDSA'
    );

    const { payload: verifiedPayload } = await compactVerify(payload, publicKey);
    const data = JWSPayloadSchema.parse(JSON.parse(new TextDecoder().decode(verifiedPayload)));

    if (data.order_id !== orderId.toString()) {
      return { path: 'SIGNED', result: 'FAIL', values: { error: 'Order ID mismatch' } };
    }
    if (data.lot_number !== lotNumber) {
      return { path: 'SIGNED', result: 'FAIL', values: { error: 'Lot number mismatch' } };
    }
    if (sealNumber && data.seal_number !== sealNumber) {
      return { path: 'SIGNED', result: 'FAIL', values: { error: 'Seal number mismatch' } };
    }

    const contract = await getContractForOrder(orderId);
    if (!contract) {
      return { path: 'SIGNED', result: 'INCONCLUSIVE', values: { error: 'Contract not found' } };
    }

    const requiredNames = contract.quality_limits.map((limit: { name: string }) => limit.name.toLowerCase());
    const seen = new Set<string>();
    let allPass = requiredNames.length > 0;
    for (const param of data.parameters) {
      const parameterName = param.name.toLowerCase();
      if (seen.has(parameterName)) {
        return { path: 'SIGNED', result: 'FAIL', values: { error: `Duplicate parameter: ${param.name}` } };
      }
      seen.add(parameterName);
      const limit = contract.quality_limits.find((l: any) => l.name.toLowerCase() === parameterName);
      if (!limit) continue;
      if (!checkValue(limit, param.value, param.unit)) {
        allPass = false;
      }
    }
    if (requiredNames.some((name: string) => !seen.has(name))) allPass = false;

    const result = allPass ? 'PASS' : 'FAIL';
    await recordDecision(orderId, await sha256(payload), 'SIGNED', result, JSON.stringify(data));
    return { path: 'SIGNED', result, values: data };
  } catch (e) {
    return { path: 'SIGNED', result: 'INCONCLUSIVE', values: { error: String(e) } };
  }
}

async function getContractForOrder(orderId: number) {
  const db = getDb();
  const order = db.prepare('SELECT contract_json FROM orders WHERE id = ?').get(orderId) as { contract_json: string } | undefined;
  return order ? JSON.parse(order.contract_json) : null;
}

export async function extractUnsignedPdf(text: string): Promise<ExtractedLabData> {
  const containsInstructions = detectInjection(text);

  const paramRegex = /([A-Za-z\s]+?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z%\/]+)/g;
  const parameters: ExtractedLabData['parameters'] = [];
  let match;
  while ((match = paramRegex.exec(text)) !== null) {
    parameters.push({
      name: match[1].trim(),
      value: parseFloat(match[2]),
      unit: match[3].trim(),
      snippet: match[0].trim(),
    });
  }

  const lotMatch = text.match(/(?:lot|batch)[\s\:#]*([A-Z0-9\-]+)/i);
  const dateMatch = text.match(/(?:date|issued)[\s\:#]*([0-9]{4}[\-\/][0-9]{2}[\-\/][0-9]{2}|[0-9]{2}[\-\/][0-9]{2}[\-\/][0-9]{4})/i);
  const labMatch = text.match(/(?:lab|laboratory)\s*[:#-]\s*([^\r\n]+)/i);

  return {
    labName: labMatch?.[1]?.trim() || 'Unknown Lab',
    // Missing lot information must not be inferred from the order. Doing so
    // would let an unrelated PDF appear to belong to this shipment.
    lotNumber: lotMatch?.[1]?.trim() || '',
    reportDate: dateMatch?.[1]?.trim() || '',
    parameters,
    containsInstructions,
  };
}

export async function verifyUnsignedExtraction(
  extracted: ExtractedLabData,
  orderId: number,
  lotNumber: string,
  fileSha256: string,
  fullText: string
): Promise<VerificationResult> {
  if (extracted.containsInstructions) {
    await recordDecision(orderId, fileSha256, 'UNSIGNED', 'INCONCLUSIVE', JSON.stringify(extracted));
    return { path: 'UNSIGNED', result: 'INCONCLUSIVE', values: extracted, injectionDetected: true };
  }

  if (await hasDecisionBeenUsed(fileSha256)) {
    await recordDecision(orderId, fileSha256, 'UNSIGNED', 'INCONCLUSIVE', JSON.stringify(extracted));
    return { path: 'UNSIGNED', result: 'INCONCLUSIVE', values: extracted, injectionDetected: false };
  }

  if (!extracted.labName || extracted.labName === 'Unknown Lab' || !extracted.reportDate || !extracted.lotNumber || extracted.lotNumber !== lotNumber) {
    await recordDecision(orderId, fileSha256, 'UNSIGNED', 'INCONCLUSIVE', JSON.stringify(extracted));
    return { path: 'UNSIGNED', result: 'INCONCLUSIVE', values: extracted };
  }

  const contract = await getContractForOrder(orderId);
  if (!contract) {
    return { path: 'UNSIGNED', result: 'INCONCLUSIVE', values: extracted };
  }

  const seen = new Set<string>();
  const duplicate = extracted.parameters.some((parameter) => {
    const name = parameter.name.toLowerCase();
    if (seen.has(name)) return true;
    seen.add(name);
    return false;
  });
  const requiredNames = contract.quality_limits.map((limit: { name: string }) => limit.name.toLowerCase());
  if (duplicate || extracted.parameters.length === 0 || requiredNames.some((name: string) => !seen.has(name))) {
    await recordDecision(orderId, fileSha256, 'UNSIGNED', 'INCONCLUSIVE', JSON.stringify(extracted));
    return { path: 'UNSIGNED', result: 'INCONCLUSIVE', values: extracted };
  }

  const snippetChecks: Array<{ parameter: string; passed: boolean }> = [];
  let allPass = true;

  for (const param of extracted.parameters) {
    const limit = contract.quality_limits.find((l: any) => l.name.toLowerCase() === param.name.toLowerCase());
    if (!limit) {
      snippetChecks.push({ parameter: param.name, passed: false });
      continue;
    }

    const snippetOk = checkSnippetInText(fullText, param.snippet, param.value);
    const valueOk = checkValue(limit, param.value, param.unit);
    const passed = snippetOk && valueOk;
    snippetChecks.push({ parameter: param.name, passed });
    if (!passed) allPass = false;
  }

  const result = allPass ? 'PASS' : 'FAIL';
  await recordDecision(orderId, fileSha256, 'UNSIGNED', result, JSON.stringify(extracted));
  return { path: 'UNSIGNED', result, values: extracted, snippetChecks };
}

export async function sha256(data: string | Buffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Buffer.from(hash).toString('hex');
}
