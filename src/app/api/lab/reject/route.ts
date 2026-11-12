import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog } from '@/lib/state';

export async function POST(req: NextRequest) {
  try {
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
    if (!order || order.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json({ error: 'Order not found or not awaiting approval' }, { status: 400 });
    }

    // Buyer rejected - go back to VERIFY_PENDING for re-upload
    transitionOrder(orderIdNum, 'VERIFY_PENDING', session.email);
    auditLog({ actor: session.email, orderId: orderIdNum, action: 'LAB_REPORT_REJECTED' });

    return NextResponse.json({ success: true, newStatus: 'VERIFY_PENDING' });
  } catch (err) {
    console.error('Reject lab error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}