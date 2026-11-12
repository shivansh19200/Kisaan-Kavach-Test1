import { getDb } from '../db/repo';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const secretKey = new TextEncoder().encode(SESSION_SECRET);

export interface SessionPayload {
  userId: number;
  email: string;
  role: 'BUYER' | 'SELLER' | 'ARBITER';
  language: 'en' | 'hi' | 'mr';
  exp: number;
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secretKey);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();
  db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(payload.userId, token, expiresAt);
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")').get(token) as { user_id: number } | undefined;
    if (!session) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    cookieStore.delete('session');
  }
}

export async function requireAuth(allowedRoles?: ('BUYER' | 'SELLER' | 'ARBITER')[]) {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export function getUserLanguage(session: SessionPayload | null): 'en' | 'hi' | 'mr' {
  return session?.language || 'en';
}