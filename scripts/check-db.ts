import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
const users = db.prepare('SELECT email, role, language FROM users').all();
console.log('Users:', users);