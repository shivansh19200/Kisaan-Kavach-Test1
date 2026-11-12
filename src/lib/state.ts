import { getDb } from './db/repo';
import { auditLog } from './audit';

export type OrderStatus =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'VERIFY_PENDING'
  | 'AWAITING_APPROVAL'
  | 'LAB_PASSED'
  | 'PARTIALLY_CAPTURED'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'FULLY_CAPTURED'
  | 'REAUTH_NEEDED'
  | 'EXPIRED'
  | 'VOIDED';

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['AUTHORIZED', 'VOIDED'],
  AUTHORIZED: ['VERIFY_PENDING', 'REAUTH_NEEDED', 'VOIDED'],
  VERIFY_PENDING: ['LAB_PASSED', 'AWAITING_APPROVAL', 'VOIDED'],
  AWAITING_APPROVAL: ['LAB_PASSED', 'VERIFY_PENDING'],
  LAB_PASSED: ['PARTIALLY_CAPTURED'],
  PARTIALLY_CAPTURED: ['DELIVERED', 'DISPUTED', 'EXPIRED'],
  DELIVERED: ['FULLY_CAPTURED'],
  DISPUTED: ['DELIVERED', 'REFUNDED'],
  REFUNDED: [],
  FULLY_CAPTURED: [],
  REAUTH_NEEDED: ['AUTHORIZED', 'EXPIRED'],
  EXPIRED: [],
  VOIDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export function transitionOrder(orderId: number, newStatus: OrderStatus, actor: string, paypalDebugId?: string): boolean {
  const db = getDb();
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId) as { status: OrderStatus } | undefined;
  if (!order) throw new Error('Order not found');

  if (!canTransition(order.status, newStatus)) {
    throw new Error(`Illegal state transition: ${order.status} -> ${newStatus}`);
  }

  const before = order.status;
  const result = db.prepare('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?').run(newStatus, orderId);
  if (result.changes === 0) return false;

  auditLog({ actor, orderId, action: 'STATUS_CHANGE', before, after: newStatus, paypalDebugId });
  return true;
}

export function getOrderStatus(orderId: number): OrderStatus | null {
  const db = getDb();
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId) as { status: OrderStatus } | undefined;
  return order?.status ?? null;
}

export function getOrderWithAuth(orderId: number) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) return null;
  const auth = db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1 ORDER BY created_at DESC LIMIT 1').get(orderId) as any;
  return { ...order, contract: JSON.parse(order.contract_json), authorization: auth };
}

export function createAuthorizationRecord(orderId: number, paypalAuthId: string, createTime: string, expirationTime: string, honorUntil?: string, parentId?: number) {
  const db = getDb();
  if (parentId) {
    db.prepare('UPDATE authorizations SET is_current = 0 WHERE id = ?').run(parentId);
  }
  db.prepare(`
    INSERT INTO authorizations (order_id, paypal_authorization_id, parent_id, status, create_time, expiration_time, honor_until, is_current)
    VALUES (?, ?, ?, 'CREATED', ?, ?, ?, 1)
  `).run(orderId, paypalAuthId, parentId || null, createTime, expirationTime, honorUntil || null);
}

export function updateAuthorizationStatus(authId: string, status: string) {
  const db = getDb();
  db.prepare('UPDATE authorizations SET status = ? WHERE paypal_authorization_id = ?').run(status, authId);
}

export function getCurrentAuthorization(orderId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM authorizations WHERE order_id = ? AND is_current = 1 ORDER BY created_at DESC LIMIT 1').get(orderId) as any;
}

export function recordCapture(orderId: number, stage: 1 | 2, requestId: string, paypalCaptureId: string, amountMinor: number, finalCapture: boolean, status: string, rawStatus: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO captures (order_id, stage, request_id, paypal_capture_id, amount_minor, final_capture, status, raw_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, stage, requestId, paypalCaptureId, amountMinor, finalCapture ? 1 : 0, status, rawStatus);
}

export function updateCaptureStatus(orderId: number, stage: 1 | 2, status: string, rawStatus?: string) {
  const db = getDb();
  if (rawStatus) {
    db.prepare('UPDATE captures SET status = ?, raw_status = ? WHERE order_id = ? AND stage = ?').run(status, rawStatus, orderId, stage);
  } else {
    db.prepare('UPDATE captures SET status = ? WHERE order_id = ? AND stage = ?').run(status, orderId, stage);
  }
}

export function recordRefund(orderId: number, n: number, requestId: string, paypalRefundId: string, amountMinor: number, status: string, rawStatus: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO refunds (order_id, n, request_id, paypal_refund_id, amount_minor, status, raw_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, n, requestId, paypalRefundId, amountMinor, status, rawStatus);
}

export function updateRefundStatus(orderId: number, n: number, status: string, rawStatus?: string) {
  const db = getDb();
  if (rawStatus) {
    db.prepare('UPDATE refunds SET status = ?, raw_status = ? WHERE order_id = ? AND n = ?').run(status, rawStatus, orderId, n);
  } else {
    db.prepare('UPDATE refunds SET status = ? WHERE order_id = ? AND n = ?').run(status, orderId, n);
  }
}

export function recordLedgerEntry(sellerId: number, orderId: number, kind: 'ADVANCE' | 'BALANCE' | 'CLAWBACK', amountMinor: number, note: string) {
  const db = getDb();
  db.prepare('INSERT INTO seller_ledger (seller_id, order_id, kind, amount_minor, note) VALUES (?, ?, ?, ?, ?)')
    .run(sellerId, orderId, kind, amountMinor, note);
}

export function recordDecision(orderId: number, fileSha256: string, path: 'SIGNED' | 'UNSIGNED', result: 'PASS' | 'FAIL' | 'INCONCLUSIVE', valuesJson: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO decisions (order_id, file_sha256, path, result, values_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(orderId, fileSha256, path, result, valuesJson);
}

export function hasDecisionBeenUsed(fileSha256: string): boolean {
  const db = getDb();
  const decision = db.prepare('SELECT 1 FROM decisions WHERE file_sha256 = ? AND result = "PASS"').get(fileSha256);
  return !!decision;
}

export { auditLog };