import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { recordRefund, updateRefundStatus, updateCaptureStatus, transitionOrder, recordLedgerEntry } from '@/lib/state';
import { auditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ARBITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, captureId, amountMinor, n } = await req.json();
    const orderIdNum = parseInt(orderId);
    const refundNum = n || 1;
    if (isNaN(orderIdNum) || !captureId) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderIdNum) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'DISPUTED') {
      return NextResponse.json({ error: 'Order must be in DISPUTED state for refund' }, { status: 400 });
    }

    const requestId = `order:${orderIdNum}:refund:${refundNum}`;
    const invoiceId = `REF-${orderIdNum}-${refundNum}`;

    const client = getPaypalClient();
    const refund = await client.refundCapture(captureId, {
      amountMinor: amountMinor || Math.floor(order.total_minor * (order.advance_pct || 30) / 100),
      currency: order.currency,
      requestId,
      invoiceId,
    });

    recordRefund(orderIdNum, refundNum, requestId, refund.id, amountMinor || Math.floor(order.total_minor * (order.advance_pct || 30) / 100), refund.status, refund.status);

    const seller = db.prepare('SELECT id FROM users WHERE id = ?').get(order.seller_id) as { id: number };
    recordLedgerEntry(seller.id, orderIdNum, 'CLAWBACK', amountMinor || Math.floor(order.total_minor * (order.advance_pct || 30) / 100), 'Refund due to quality dispute');

    if (refund.status === 'COMPLETED' || refund.status === 'PENDING') {
      updateRefundStatus(orderIdNum, refundNum, refund.status, refund.status);
      updateCaptureStatus(orderIdNum, 1, 'REFUNDED', refund.status);

      // Void remaining authorization
      try {
        const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1').get(orderIdNum) as any;
        if (auth) {
          await client.voidAuthorization(auth.paypal_authorization_id);
        }
      } catch (e) {
        console.error('Void after refund failed:', e);
      }

      transitionOrder(orderIdNum, 'REFUNDED', session.email);
    } else {
      return NextResponse.json({ error: 'Refund failed', details: refund }, { status: 400 });
    }

    auditLog({ actor: session.email, orderId: orderIdNum, action: 'REFUND', after: refund.status, paypalDebugId: refund.id });

    return NextResponse.json({ success: true, refund });
  } catch (err) {
    console.error('Refund error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}