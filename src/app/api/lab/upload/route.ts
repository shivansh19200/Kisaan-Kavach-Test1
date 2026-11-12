import { NextRequest, NextResponse } from 'next/server';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder } from '@/lib/state';
import { extractUnsignedPdf, verifySignedJWS, verifyUnsignedExtraction, sha256 } from '@/lib/verifier';
import { hasDecisionBeenUsed } from '@/lib/state';
import { extractText } from 'unpdf';
import { isSameOrigin } from '@/lib/public-url';

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 403 });
    }
    const session = await getSession();
    if (!session || session.role !== 'SELLER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const orderId = parseInt(formData.get('orderId') as string);
    if (!file || isNaN(orderId)) {
      return NextResponse.json({ error: 'Missing file or orderId' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(orderId, session.userId) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!['AUTHORIZED', 'VERIFY_PENDING', 'AWAITING_APPROVAL'].includes(order.status)) {
      return NextResponse.json({ error: 'Lab report cannot be uploaded at this stage' }, { status: 400 });
    }

    const contract = JSON.parse(order.contract_json);
    const lotNumber = contract.batch_id || order.batch_id;
    const sealNumber = contract.seal_id || order.seal_id;

    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const buffer = Buffer.from(rawBytes);
    const isPdf = buffer.subarray(0, 4).toString() === '%PDF';
    const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => rawBytes[index] === byte);
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!(isPdf || isPng || isJpeg)) return NextResponse.json({ error: 'Upload a valid PDF, PNG, or JPEG file.' }, { status: 400 });
    const maxSize = isPdf ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
    if (buffer.byteLength > maxSize) return NextResponse.json({ error: 'The selected file is too large.' }, { status: 413 });
    const fileSha256 = await sha256(buffer);

    // Check for replay
    if (await hasDecisionBeenUsed(fileSha256)) {
      return NextResponse.json({ error: 'This file has already been used for a decision' }, { status: 400 });
    }

    let result: any;

    if (isPdf) {
      // Extract text from PDF
      const pdfText = await extractText(rawBytes);
      const fullText = (pdfText.text || []).join('\n');
      if (!fullText.trim()) {
        return NextResponse.json({ error: 'This PDF has no readable text. Upload a text-based lab report or a clear report image.' }, { status: 422 });
      }

      // Check if it's a signed JWS (look for JWS pattern in text)
      const jwsMatch = fullText.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwsMatch) {
        // Try to verify as signed JWS
        result = await verifySignedJWS(jwsMatch[0], orderId, lotNumber, sealNumber);
      } else {
        // Unsigned PDF path
        const extracted = await extractUnsignedPdf(fullText, orderId, lotNumber);
        result = await verifyUnsignedExtraction(extracted, orderId, lotNumber, fileSha256, fullText);
      }
    } else {
      const image = isPng
        ? PNG.sync.read(buffer)
        : jpeg.decode(rawBytes, { useTArray: true });
      const qr = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
      if (!qr) return NextResponse.json({ error: 'No certified code could be read. Try a clearer photo or upload the lab PDF.' }, { status: 422 });
      result = await verifySignedJWS(qr.data, orderId, lotNumber, sealNumber);
    }

    if (result.result !== 'PASS') {
      const error = result.result === 'FAIL'
        ? 'Lab report verification failed. Its signature, order details, or measured values do not meet this contract. Payment remains blocked.'
        : 'This file could not be verified as a lab report for this order. Check that it names the matching lot, report date, lab, every contracted test, and includes a valid registered lab signature.';
      return NextResponse.json({
        error,
        result: result.result,
        path: result.path,
        values: result.values,
        snippetChecks: result.snippetChecks,
        injectionDetected: result.injectionDetected,
      }, { status: 422 });
    }

    db.prepare('INSERT INTO evidence (order_id, kind, file_sha256, blob, submitted_by) VALUES (?, ?, ?, ?, ?)')
      .run(orderId, 'LAB_REPORT', fileSha256, buffer, session.userId);

    if (order.status === 'AUTHORIZED' || order.status === 'AWAITING_APPROVAL') {
      transitionOrder(orderId, 'VERIFY_PENDING', session.email);
    }
    const newStatus = result.result === 'PASS'
      ? result.path === 'UNSIGNED' ? 'AWAITING_APPROVAL' : 'LAB_PASSED'
      : 'VERIFY_PENDING';
    if (newStatus !== 'VERIFY_PENDING') transitionOrder(orderId, newStatus, session.email);

    return NextResponse.json({
      success: true,
      result: result.result,
      path: result.path,
      values: result.values,
      snippetChecks: result.snippetChecks,
      injectionDetected: result.injectionDetected,
      message: result.path === 'SIGNED'
        ? 'Signed lab certificate verified. Order, lot, signature, and contract limits match.'
        : 'Report fields and quality limits passed. The buyer must review this unsigned report before payment can proceed.',
      newStatus,
    });
  } catch (err) {
    console.error('Lab upload error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
