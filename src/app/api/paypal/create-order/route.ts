import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { auditLog } from '@/lib/state';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).origin !== new URL(req.url).origin) {
      return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 403 });
    }
    const session = await getSession();
    if (!session || session.role !== 'BUYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();
    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderIdNum, session.userId) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'CREATED') {
      return NextResponse.json({ error: `Order cannot be authorized from status ${order.status}` }, { status: 400 });
    }

    const returnUrl = `${process.env.APP_URL || new URL(req.url).origin}/api/paypal/authorize?orderId=${orderIdNum}`;
    const cancelUrl = `${process.env.APP_URL}/buyer/orders/${orderIdNum}?paypal=cancel`;

    const client = getPaypalClient();
    const result = await client.createOrder({
      orderId: orderIdNum,
      totalMinor: order.total_minor,
      currency: order.currency,
      returnUrl,
      cancelUrl,
      customId: `order-${orderIdNum}`,
    });

    auditLog({ actor: session.email, orderId: orderIdNum, action: 'PAYMENT_APPROVAL_STARTED' });

    return NextResponse.json({ approveUrl: result.approveUrl, paypalOrderId: result.orderId });
  } catch (err) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
