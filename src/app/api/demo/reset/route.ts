import { NextResponse } from 'next/server';
import { resetDemoData } from '@/lib/db/repo';

export async function POST() {
  if (!process.env.DEMO_MODE) {
    return NextResponse.json({ error: 'Demo mode not enabled' }, { status: 403 });
  }
  resetDemoData();
  return NextResponse.json({ success: true });
}