'use server';

import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog, recordRefund, updateRefundStatus, updateCaptureStatus } from '@/lib/state';
import { getPaypalClient } from '@/lib/paypal';
import { revalidatePath } from 'next/cache';

export async function acceptClaim(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'ARBITER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order || order.status !== 'DISPUTED') return;

  const firstPaymentMinor = Math.floor(order.total_minor * (order.advance_pct || 30) / 100);
  const capture = db.prepare("SELECT * FROM captures WHERE order_id = ? AND stage = 1 AND status = 'COMPLETED'").get(orderId) as any;
  if (!capture) return;

  try {
    const client = getPaypalClient();
    const refund = await client.refundCapture(capture.paypal_capture_id, {
      amountMinor: firstPaymentMinor,
      currency: order.currency,
      requestId: `order:${orderId}:refund:1`,
      invoiceId: `REF-${orderId}-1`,
    });

    recordRefund(orderId, 1, `order:${orderId}:refund:1`, refund.id, firstPaymentMinor, refund.status, refund.status);
    updateRefundStatus(orderId, 1, refund.status, refund.status);
    updateCaptureStatus(orderId, 1, 'REFUNDED', refund.status);

    const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1').get(orderId) as any;
    if (auth) {
      try {
        await client.voidAuthorization(auth.paypal_authorization_id);
      } catch (e) {
        console.error('Void after refund failed:', e);
      }
    }

    transitionOrder(orderId, 'REFUNDED', session.email);
    auditLog({ actor: session.email, orderId, action: 'CLAIM_ACCEPTED', after: 'REFUNDED', paypalDebugId: refund.id });

    revalidatePath(`/arbiter/disputes/${orderId}`);
    revalidatePath(`/buyer/orders/${orderId}`);
    revalidatePath(`/seller/orders/${orderId}`);
  } catch (err) {
    console.error('Accept claim error:', err);
  }
}

export async function rejectClaim(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'ARBITER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order || order.status !== 'DISPUTED') return;

  transitionOrder(orderId, 'DELIVERED', session.email);
  auditLog({ actor: session.email, orderId, action: 'CLAIM_REJECTED', after: 'DELIVERED' });

  revalidatePath(`/arbiter/disputes/${orderId}`);
  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath(`/seller/orders/${orderId}`);
}