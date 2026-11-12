import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog } from '@/lib/state';
import { getPublicUrl, isSameOrigin } from '@/lib/public-url';

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 403 });
    const session = await getSession();
    if (!session || session.role !== 'BUYER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isJsonRequest = req.headers.get('content-type')?.includes('application/json') || false;
    const values = isJsonRequest ? await req.json() : Object.fromEntries(await req.formData());
    const orderIdNum = parseInt(String(values.orderId));
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderIdNum, session.userId) as any;
    if (!order || order.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json({ error: 'Order not found or not awaiting approval' }, { status: 400 });
    }

    transitionOrder(orderIdNum, 'LAB_PASSED', session.email);
    auditLog({ actor: session.email, orderId: orderIdNum, action: 'LAB_REPORT_APPROVED' });

    if (!isJsonRequest) return NextResponse.redirect(getPublicUrl(req, `/buyer/orders/${orderIdNum}`), 303);
    return NextResponse.json({ success: true, newStatus: 'LAB_PASSED' });
  } catch (err) {
    console.error('Approve lab error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
