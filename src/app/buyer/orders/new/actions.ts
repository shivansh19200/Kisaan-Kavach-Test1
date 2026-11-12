'use server';

import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { revalidatePath } from 'next/cache';

function toMinorUnits(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export async function createOrder(formData: FormData): Promise<number> {
  const session = await getSession();
  if (!session || session.role !== 'BUYER') throw new Error('Please sign in as a buyer.');

  const product = String(formData.get('product') || '').trim();
  const quantity = String(formData.get('quantity') || '').trim();
  const pricePerKg = Number(formData.get('pricePerKg'));
  const totalMinor = toMinorUnits(formData.get('totalUsd'));
  const advancePct = Number(formData.get('advancePct'));
  const batchId = `LOT-${Date.now().toString(36).toUpperCase()}`;
  const sealId = `SEAL-${Date.now().toString(36).toUpperCase()}`;
  const labWindowDays = Number(formData.get('labWindowDays'));
  const deliveryDays = Number(formData.get('deliveryDays'));
  const disputeDays = Number(formData.get('disputeDays'));

  if (!product || product.length > 100 || !quantity || quantity.length > 50) throw new Error('Enter a product and quantity.');
  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0 || !totalMinor) throw new Error('Enter a valid price and total.');
  if (!Number.isInteger(advancePct) || advancePct < 1 || advancePct > 99) throw new Error('First payment must be between 1% and 99%.');

  let qualityLimits: Array<{ name: string; max?: number; min?: number; unit: string }>;
  try {
    const parsed: unknown = JSON.parse(String(formData.get('qualityLimits') || '[]'));
    if (!Array.isArray(parsed) || parsed.length > 20 || parsed.some((limit) => !limit || typeof limit.name !== 'string' || typeof limit.unit !== 'string' || !((Number.isFinite(limit.max) && limit.max >= 0) !== (Number.isFinite(limit.min) && limit.min >= 0)))) {
      throw new Error();
    }
    qualityLimits = parsed;
  } catch {
    throw new Error('Check the quality limits and try again.');
  }

  const now = Date.now();
  const labDeadline = new Date(now + Math.min(Math.max(labWindowDays || 14, 1), 90) * 86400000).toISOString();
  const deliveryExpected = new Date(now + Math.min(Math.max(deliveryDays || 21, 1), 365) * 86400000).toISOString();
  const disputeDeadline = new Date(now + Math.min(Math.max(disputeDays || 7, 1), 30) * 86400000).toISOString();
  const contract = {
    product,
    quantity,
    price_per_kg_usd: pricePerKg,
    total_usd: totalMinor / 100,
    advance_pct: advancePct,
    quality_limits: qualityLimits,
    lab_window_days: Math.min(Math.max(labWindowDays || 14, 1), 90),
    batch_id: batchId,
    seal_id: sealId,
  };

  const result = getDb().prepare(`
    INSERT INTO orders (buyer_id, seller_id, status, contract_json, total_minor, currency, advance_pct, batch_id, seal_id, lab_deadline, delivery_expected, dispute_deadline, demo_mode)
    VALUES (?, ?, 'CREATED', ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?)
  `).run(session.userId, 2, JSON.stringify(contract), totalMinor, advancePct, batchId, sealId, labDeadline, deliveryExpected, disputeDeadline, process.env.DEMO_MODE === 'true' ? 1 : 0);

  const orderId = Number(result.lastInsertRowid);
  revalidatePath('/dashboard');
  return orderId;
}
