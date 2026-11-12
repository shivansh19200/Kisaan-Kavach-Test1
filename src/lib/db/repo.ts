import Database from 'better-sqlite3';
import path from 'path';
import { SCHEMA, SEED_USERS, getSeedOrders } from './schema.sql';
import bcrypt from 'bcryptjs';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'app.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  seedIfEmpty();
  return db;
}

function seedIfEmpty() {
  const count = db!.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) return;

  const insertUser = db!.prepare('INSERT INTO users (email, password_hash, role, language) VALUES (?, ?, ?, ?)');
  const insertOrder = db!.prepare(`
    INSERT INTO orders (buyer_id, seller_id, status, contract_json, total_minor, currency, advance_pct, batch_id, seal_id, lab_deadline, delivery_expected, dispute_deadline, demo_mode)
    VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?)
  `);

  const userIds: Record<string, number> = {};
  for (const u of SEED_USERS) {
    const hash = bcrypt.hashSync(u.password, 10);
    const result = insertUser.run(u.email, hash, u.role, u.language);
    userIds[u.email] = Number(result.lastInsertRowid);
  }

  for (const o of getSeedOrders()) {
    const buyerId = userIds[o.buyer_email];
    const sellerId = userIds[o.seller_email];
    if (buyerId && sellerId) {
      insertOrder.run(buyerId, sellerId, o.status, o.contract_json, o.total_minor, o.advance_pct, o.batch_id, o.seal_id || null, o.lab_deadline || null, o.delivery_expected || null, o.dispute_deadline || null, o.demo_mode);
    }
  }
}

export function resetDemoData() {
  if (!process.env.DEMO_MODE) return;
  const d = getDb();
  d.exec('DELETE FROM audit_log');
  d.exec('DELETE FROM seller_ledger');
  d.exec('DELETE FROM evidence');
  d.exec('DELETE FROM decisions');
  d.exec('DELETE FROM refunds');
  d.exec('DELETE FROM captures');
  d.exec('DELETE FROM authorizations');
  d.exec('DELETE FROM orders');
  seedIfEmpty();
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}