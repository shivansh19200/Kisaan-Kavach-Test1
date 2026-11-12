'use server';

import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { transitionOrder, auditLog } from '@/lib/state';
import { revalidatePath } from 'next/cache';

export async function uploadLabReport(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'SELLER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(orderId, session.userId) as any;
  if (!order) return;

  if (!['CREATED', 'AUTHORIZED', 'VERIFY_PENDING', 'AWAITING_APPROVAL'].includes(order.status)) return;

  transitionOrder(orderId, 'VERIFY_PENDING', session.email);
  auditLog({ actor: session.email, orderId, action: 'LAB_REPORT_UPLOADED' });

  revalidatePath(`/seller/orders/${orderId}`);
  revalidatePath(`/buyer/orders/${orderId}`);
}

export async function uploadShippingPaper(formData: FormData) {
  const orderId = parseInt(formData.get('orderId') as string);
  const session = await getSession();
  if (!session || session.role !== 'SELLER') return;

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(orderId, session.userId) as any;
  if (!order) return;

  if (!['PARTIALLY_CAPTURED', 'DELIVERED', 'DISPUTED'].includes(order.status)) return;

  auditLog({ actor: session.email, orderId, action: 'SHIPPING_PAPER_UPLOADED' });

  revalidatePath(`/seller/orders/${orderId}`);
  revalidatePath(`/buyer/orders/${orderId}`);
}