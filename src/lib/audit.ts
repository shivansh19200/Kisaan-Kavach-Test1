import { getDb } from './db/repo';

export interface AuditLogEntry {
  actor: string;
  orderId?: number;
  action: string;
  before?: string;
  after?: string;
  paypalDebugId?: string;
}

export function auditLog(entry: AuditLogEntry) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (ts, actor, order_id, action, before, after, paypal_debug_id)
    VALUES (datetime('now'), ?, ?, ?, ?, ?, ?)
  `).run(entry.actor, entry.orderId || null, entry.action, entry.before || null, entry.after || null, entry.paypalDebugId || null);
}