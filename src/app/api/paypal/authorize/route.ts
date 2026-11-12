import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { getPaypalClient } from '@/lib/paypal';
import { createAuthorizationRecord, transitionOrder } from '@/lib/state';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const orderId = Number(request.nextUrl.searchParams.get('orderId'));
  const paypalOrderId = request.nextUrl.searchParams.get('token');
  if (!session || session.role !== 'BUYER' || !Number.isSafeInteger(orderId) || !paypalOrderId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as { status: string } | undefined;
  if (!order || order.status !== 'CREATED') return NextResponse.redirect(new URL(`/buyer/orders/${orderId}`, request.url));

  try {
    const authorization = await getPaypalClient().authorizeOrder(paypalOrderId);
    if (authorization.status !== 'AUTHORIZED') {
      return NextResponse.redirect(new URL(`/buyer/orders/${orderId}?payment=checking`, request.url));
    }
    createAuthorizationRecord(orderId, authorization.id, authorization.create_time, authorization.expiration_time);
    transitionOrder(orderId, 'AUTHORIZED', session.email);
    return NextResponse.redirect(new URL(`/buyer/orders/${orderId}?payment=reserved`, request.url));
  } catch (error) {
    console.error('Payment approval confirmation failed:', error);
    return NextResponse.redirect(new URL(`/buyer/orders/${orderId}?payment=failed`, request.url));
  }
}
