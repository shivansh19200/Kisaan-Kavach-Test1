import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/repo';
import { auditLog } from '@/lib/audit';
import { isSameOrigin } from '@/lib/public-url';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Please refresh the page and try again.' }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.role !== 'SELLER') return NextResponse.json({ error: 'Please sign in as the seller.' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const orderId = Number(formData.get('orderId'));
    if (!(file instanceof File) || !Number.isSafeInteger(orderId)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Images and shipping papers must be 3 MB or smaller.' }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validType = (file.type === 'application/pdf' && Buffer.from(bytes.subarray(0, 4)).toString() === '%PDF')
      || (file.type === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte))
      || (file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff);
    if (!validType) return NextResponse.json({ error: 'Upload a valid PDF, PNG, or JPEG file.' }, { status: 400 });

    const db = getDb();
    const order = db.prepare('SELECT status FROM orders WHERE id = ? AND seller_id = ?').get(orderId, session.userId) as { status: string } | undefined;
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (!['PARTIALLY_CAPTURED', 'DELIVERED', 'DISPUTED'].includes(order.status)) return NextResponse.json({ error: 'Shipping papers can be added after the first payment.' }, { status: 409 });

    const hash = createHash('sha256').update(bytes).digest('hex');
    db.prepare('INSERT INTO evidence (order_id, kind, file_sha256, blob, submitted_by) VALUES (?, ?, ?, ?, ?)')
      .run(orderId, 'SHIPPING_PAPER', hash, Buffer.from(bytes), session.userId);
    auditLog({ actor: session.email, orderId, action: 'SHIPPING_PAPER_UPLOADED' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shipping paper upload failed:', error);
    return NextResponse.json({ error: 'Could not save the shipping paper. Please try again.' }, { status: 500 });
  }
}
