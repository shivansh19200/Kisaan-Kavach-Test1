import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/repo';

export async function GET() {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}