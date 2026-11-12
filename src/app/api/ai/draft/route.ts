import { NextRequest, NextResponse } from 'next/server';
import { draftContract } from '@/lib/ai';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'BUYER') {
      return NextResponse.json({ error: 'Please sign in as a buyer.' }, { status: 401 });
    }
    const { plainTerms } = await req.json();
    if (!plainTerms || typeof plainTerms !== 'string') {
      return NextResponse.json({ error: 'Plain terms required' }, { status: 400 });
    }

    const result = await draftContract(plainTerms);

    if ('_error' in result) {
      return NextResponse.json({ error: result.error || 'The AI provider could not draft this contract. Check its Render settings.' }, { status: 503 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI draft error:', err);
    return NextResponse.json({ error: 'Drafting failed' }, { status: 500 });
  }
}
