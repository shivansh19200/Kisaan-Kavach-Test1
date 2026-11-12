import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { transitionOrder } from '@/lib/state';
import { auditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'BUYER' && session.role !== 'ARBITER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await req.json();
    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderIdNum) as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1').get(orderIdNum) as any;
    if (!auth) {
      return NextResponse.json({ error: 'No active authorization' }, { status: 400 });
    }

    const captures = db.prepare("SELECT * FROM captures WHERE order_id = ? AND status = 'COMPLETED'").all(orderIdNum) as any[];
    if (captures.length > 0) {
      return NextResponse.json({ error: 'Cannot void after capture; use refund instead' }, { status: 400 });
    }

    const client = getPaypalClient();
    const result = await client.voidAuthorization(auth.paypal_authorization_id);

    if (result.status === 'VOIDED') {
      transitionOrder(orderIdNum, 'VOIDED', session.email);
      auditLog({ actor: session.email, orderId: orderIdNum, action: 'VOID', after: 'VOIDED' });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Void failed', details: result }, { status: 400 });
  } catch (err) {
    console.error('Void error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}