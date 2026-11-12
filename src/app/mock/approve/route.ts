import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { createAuthorizationRecord, transitionOrder } from '@/lib/state';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const orderId = Number(request.nextUrl.searchParams.get('orderId'));
  const authorizationId = request.nextUrl.searchParams.get('authId');
  if (!session || session.role !== 'BUYER' || !Number.isSafeInteger(orderId) || !authorizationId?.startsWith(`MOCK_AUTH_${orderId}_`)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const order = getDb().prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as { status: string; total_minor: number; currency: string } | undefined;
  if (!order || order.status !== 'CREATED') return NextResponse.redirect(new URL(`/buyer/orders/${orderId}`, request.url));

  const now = new Date();
  const expiration = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
  createAuthorizationRecord(orderId, authorizationId, now.toISOString(), expiration.toISOString());
  transitionOrder(orderId, 'AUTHORIZED', session.email);
  return NextResponse.redirect(new URL(`/buyer/orders/${orderId}?payment=reserved`, request.url));
}
