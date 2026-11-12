import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { summarizeDispute, isRecordedAI, RECORDED_DISPUTE_SUMMARY } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ARBITER' && session.role !== 'BUYER')) {
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

    const contract = JSON.parse(order.contract_json);
    const sellerReport = { moisture: 8.0, curcumin: 3.5 };
    const buyerReport = { moisture: 12.5, curcumin: 2.8 };

    const result = await summarizeDispute(contract, sellerReport, buyerReport);

    if (isRecordedAI(result)) {
      return NextResponse.json({ ...RECORDED_DISPUTE_SUMMARY, _recorded: true });
    }

    if ('_error' in result) {
      return NextResponse.json({ error: result.error || 'Summary failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI dispute summary error:', err);
    return NextResponse.json({ error: 'Summary failed' }, { status: 500 });
  }
}