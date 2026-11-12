import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { getPublicUrl } from '@/lib/public-url';

export async function POST(req: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(getPublicUrl(req, '/login'), 303);
}
