import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/repo';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as { id: number; email: string; password_hash: string; role: string; language: string } | undefined;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await createSession({ userId: user.id, email: user.email, role: user.role as 'BUYER' | 'SELLER' | 'ARBITER', language: user.language as 'en' | 'hi' | 'mr' });

    return NextResponse.json({ success: true, role: user.role, language: user.language });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
