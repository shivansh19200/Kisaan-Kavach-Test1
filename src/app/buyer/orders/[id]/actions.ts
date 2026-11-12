'use server';

import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog } from '@/lib/state';
import { revalidatePath } from 'next/cache';

export async function confirmDelivery(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'BUYER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as any;
  if (!order) return;

  if (order.status !== 'DELIVERED' && order.status !== 'PARTIALLY_CAPTURED') return;

  transitionOrder(orderId, 'DELIVERED', session.email);
  auditLog({ actor: session.email, orderId, action: 'DELIVERY_CONFIRMED' });

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath(`/seller/orders/${orderId}`);
}

export async function reportQualityProblem(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'BUYER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as any;
  if (!order) return;

  if (!['PARTIALLY_CAPTURED', 'DELIVERED'].includes(order.status)) return;

  const disputeDeadline = new Date(order.dispute_deadline);
  if (new Date() > disputeDeadline) return;

  transitionOrder(orderId, 'DISPUTED', session.email);
  auditLog({ actor: session.email, orderId, action: 'QUALITY_PROBLEM_REPORTED' });

  revalidatePath(`/buyer/orders/${orderId}`);
  revalidatePath(`/seller/orders/${orderId}`);
  revalidatePath(`/arbiter/disputes/${orderId}`);
}