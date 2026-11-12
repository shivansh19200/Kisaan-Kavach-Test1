import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { createAuthorizationRecord, transitionOrder } from '@/lib/state';
import { getPublicUrl } from '@/lib/public-url';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const orderId = Number(request.nextUrl.searchParams.get('orderId'));
  const paypalOrderId = request.nextUrl.searchParams.get('token');
  if (!session || session.role !== 'BUYER' || !Number.isSafeInteger(orderId) || !paypalOrderId) {
    return NextResponse.redirect(getPublicUrl(request, '/dashboard'));
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as { status: string } | undefined;
  if (!order || order.status !== 'CREATED') return NextResponse.redirect(getPublicUrl(request, `/buyer/orders/${orderId}`));

  try {
    const authorization = await getPaypalClient().authorizeOrder(paypalOrderId);
    if (authorization.status !== 'AUTHORIZED') {
      return NextResponse.redirect(getPublicUrl(request, `/buyer/orders/${orderId}?payment=checking`));
    }
    createAuthorizationRecord(orderId, authorization.id, authorization.create_time, authorization.expiration_time);
    transitionOrder(orderId, 'AUTHORIZED', session.email);
    return NextResponse.redirect(getPublicUrl(request, `/buyer/orders/${orderId}?payment=reserved`));
  } catch (error) {
    console.error('Payment approval confirmation failed:', error);
    return NextResponse.redirect(getPublicUrl(request, `/buyer/orders/${orderId}?payment=failed`));
  }
}
