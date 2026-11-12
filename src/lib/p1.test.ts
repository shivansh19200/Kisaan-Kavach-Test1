import { describe, it, expect } from 'vitest';
import en from './i18n/messages/en.json';
import hi from './i18n/messages/hi.json';
import mr from './i18n/messages/mr.json';
import { getDb } from './db/repo';

describe('P1: i18n catalog tests', () => {
  it('en, hi, and mr catalogs must have identical keys', () => {
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();
    const mrKeys = Object.keys(mr).sort();

    expect(hiKeys).toEqual(enKeys);
    expect(mrKeys).toEqual(enKeys);
  });

  it('no empty strings in catalogs', () => {
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim().length, `en key ${k} is empty`).toBeGreaterThan(0);
    }
    for (const [k, v] of Object.entries(hi)) {
      expect(v.trim().length, `hi key ${k} is empty`).toBeGreaterThan(0);
    }
    for (const [k, v] of Object.entries(mr)) {
      expect(v.trim().length, `mr key ${k} is empty`).toBeGreaterThan(0);
    }
  });

  it('banned words are not present in user-facing English strings', () => {
    const banned = [
      'escrow', 'authorization', 'authorize', 'capture', 'void', 'arbiter',
      'gate', 'jws', 'payload', 'stage', 'ledger', 'clawback',
      'reconcile', 'sandbox', 'injection', 'guaranteed'
    ];
    // Check all values in en.json except internal debugging or where allowed
    for (const [k, v] of Object.entries(en)) {
      // Allow internal role keys or technical mappings if any
      const lower = v.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, '[email]').toLowerCase();
      for (const word of banned) {
        // Exclude specific permitted contexts if needed
        expect(lower.includes(word), `Banned word "${word}" found in en key "${k}": "${v}"`).toBe(false);
      }
    }
  });
});

describe('P1: Database and seed data', () => {
  it('seeds 4 demo users and orders for every order state', () => {
    const db = getDb();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    expect(users.count).toBe(4);

    const orders = db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all() as Array<{ status: string; count: number }>;
    expect(orders.length).toBe(13); // All 13 order states seeded
  });
});
