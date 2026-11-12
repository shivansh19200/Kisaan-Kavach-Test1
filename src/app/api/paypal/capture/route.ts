import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { getCurrentAuthorization, recordCapture, transitionOrder, recordLedgerEntry } from '@/lib/state';
import { auditLog } from '@/lib/audit';
import { isSameOrigin } from '@/lib/public-url';

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 403 });
    }
    const session = await getSession();
    if (!session || session.role !== 'BUYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, stage } = await req.json();
    const orderIdNum = Number(orderId);
    const stageNum = Number(stage);
    if (!Number.isSafeInteger(orderIdNum) || (stageNum !== 1 && stageNum !== 2)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderIdNum, session.userId) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if ((stageNum === 1 && order.status !== 'LAB_PASSED') || (stageNum === 2 && order.status !== 'DELIVERED')) {
      return NextResponse.json({ error: 'The order is not ready for this payment.' }, { status: 409 });
    }

    const existing = db.prepare('SELECT status, paypal_capture_id FROM captures WHERE order_id = ? AND stage = ?').get(orderIdNum, stageNum) as { status: string; paypal_capture_id: string | null } | undefined;
    if (existing) {
      const status = existing.status === 'COMPLETED' ? 200 : 202;
      return NextResponse.json({ success: existing.status === 'COMPLETED', status: existing.status, captureId: existing.paypal_capture_id }, { status });
    }

    const auth = getCurrentAuthorization(orderIdNum);
    if (!auth) {
      return NextResponse.json({ error: 'No active authorization' }, { status: 400 });
    }

    const advancePct = order.advance_pct || 30;
    const totalMinor = order.total_minor;
    let amountMinor: number;
    let finalCapture: boolean;

    if (stageNum === 1) {
      amountMinor = Math.floor(totalMinor * advancePct / 100);
      finalCapture = false;
    } else {
      const captured = db.prepare("SELECT COALESCE(SUM(amount_minor), 0) as total FROM captures WHERE order_id = ? AND status = 'COMPLETED'").get(orderIdNum) as { total: number };
      amountMinor = totalMinor - captured.total;
      finalCapture = true;
    }

    if (amountMinor <= 0) {
      return NextResponse.json({ error: 'Nothing to capture' }, { status: 400 });
    }

    const requestId = `order:${orderIdNum}:stage${stageNum}`;
    const invoiceId = `INV-${orderIdNum}-S${stageNum}`;

    const client = getPaypalClient();
    const capture = await client.captureAuthorization(auth.paypal_authorization_id, {
      amountMinor,
      currency: order.currency,
      finalCapture,
      invoiceId,
      requestId,
    });

    if (capture.status === 'COMPLETED') {
      recordCapture(orderIdNum, stageNum as 1 | 2, requestId, capture.id, amountMinor, finalCapture, 'COMPLETED', capture.status);
      const seller = db.prepare('SELECT id FROM users WHERE id = ?').get(order.seller_id) as { id: number };
      if (stageNum === 1) {
        recordLedgerEntry(seller.id, orderIdNum, 'ADVANCE', amountMinor, 'First payment (30%)');
        transitionOrder(orderIdNum, 'PARTIALLY_CAPTURED', session.email, capture.id);
      } else {
        recordLedgerEntry(seller.id, orderIdNum, 'BALANCE', amountMinor, 'Final payment (70%)');
        transitionOrder(orderIdNum, 'FULLY_CAPTURED', session.email, capture.id);
      }
    } else {
      const captureState = capture.status === 'PENDING' ? 'RECONCILING' : 'FAILED';
      recordCapture(orderIdNum, stageNum as 1 | 2, requestId, capture.id, amountMinor, finalCapture, captureState, capture.status);
      return NextResponse.json({ error: capture.status === 'PENDING' ? 'The payment is being confirmed.' : 'The payment could not be completed.', details: capture }, { status: capture.status === 'PENDING' ? 202 : 400 });
    }

    auditLog({ actor: session.email, orderId: orderIdNum, action: `STAGE${stageNum}_CAPTURE`, after: capture.status, paypalDebugId: capture.id });

    return NextResponse.json({ success: true, capture });
  } catch (err) {
    console.error('Capture error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
