import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog } from '@/lib/state';
import { getPaypalClient } from '@/lib/paypal';

export async function POST() {
  const db = getDb();
  const now = new Date().toISOString();

  // Check for expired lab deadlines (VOID if lab report never uploaded)
  const expiredLabOrders = db.prepare(`
    SELECT id, buyer_id, status FROM orders
    WHERE lab_deadline < ? AND status IN ('CREATED', 'AUTHORIZED', 'VERIFY_PENDING', 'AWAITING_APPROVAL')
  `).all(now) as Array<{ id: number; buyer_id: number; status: string }>;

  for (const order of expiredLabOrders) {
    try {
      const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1').get(order.id) as any;
      if (auth) {
        const client = getPaypalClient();
        await client.voidAuthorization(auth.paypal_authorization_id);
      }
      transitionOrder(order.id, 'VOIDED', 'system');
      auditLog({ actor: 'system', orderId: order.id, action: 'LAB_DEADLINE_VOID' });
    } catch (e) {
      console.error(`Failed to void order ${order.id}:`, e);
    }
  }

  // Check for expired authorizations (REAUTH_NEEDED)
  const expiringAuths = db.prepare(`
    SELECT id FROM orders
    WHERE status IN ('AUTHORIZED', 'PARTIALLY_CAPTURED', 'DELIVERED')
    AND EXISTS (
      SELECT 1 FROM authorizations a WHERE a.order_id = orders.id AND a.is_current = 1
      AND a.expiration_time < ?
    )
  `).all(now) as Array<{ id: number }>;

  for (const order of expiringAuths) {
    transitionOrder(order.id, 'REAUTH_NEEDED', 'system');
    auditLog({ actor: 'system', orderId: order.id, action: 'REAUTH_NEEDED' });
  }

  // Check for dispute deadline auto-release (silent buyer)
  const disputeExpired = db.prepare(`
    SELECT id FROM orders
    WHERE status = 'DISPUTED' AND dispute_deadline < ?
  `).all(now) as Array<{ id: number }>;

  for (const order of disputeExpired) {
    // Auto-release: buyer didn't respond, pay seller
    const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1').get(order.id) as any;
    if (auth) {
      try {
        const client = getPaypalClient();
        const orderDetails = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as any;
        const totalMinor = orderDetails.total_minor;
        const advancePct = orderDetails.advance_pct || 30;
        const capturedMinor = db.prepare('SELECT COALESCE(SUM(amount_minor), 0) as total FROM captures WHERE order_id = ? AND status = "COMPLETED"').get(order.id) as { total: number };
        const remainingMinor = totalMinor - capturedMinor.total;

        if (remainingMinor > 0) {
          await client.captureAuthorization(auth.paypal_authorization_id, {
            amountMinor: remainingMinor,
            currency: orderDetails.currency,
            finalCapture: true,
            invoiceId: `INV-${order.id}-S2-AUTO`,
            requestId: `order:${order.id}:stage2:auto`,
          });
        }
      } catch (e) {
        console.error(`Auto-release capture failed for order ${order.id}:`, e);
      }
    }
    transitionOrder(order.id, 'FULLY_CAPTURED', 'system');
    auditLog({ actor: 'system', orderId: order.id, action: 'DISPUTE_AUTO_RELEASE' });
  }

  return NextResponse.json({ success: true, processed: expiredLabOrders.length + expiringAuths.length + disputeExpired.length });
}