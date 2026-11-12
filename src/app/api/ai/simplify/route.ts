import { NextRequest, NextResponse } from 'next/server';
import { rewriteSimply, isRecordedAI, RECORDED_SIMPLE, validateSimpleRewrite } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const result = await rewriteSimply(text);

    if (isRecordedAI(result)) {
      return NextResponse.json({ simpleText: RECORDED_SIMPLE, _recorded: true });
    }

    if ('_error' in result) {
      return NextResponse.json({ simpleText: text, _fallback: true, error: result.error });
    }

    // result has simpleText property
    const simpleText = (result as { simpleText: string }).simpleText;
    const validation = validateSimpleRewrite(text, simpleText);
    if (!validation.valid) {
      return NextResponse.json({ simpleText: text, _fallback: true, error: validation.reason });
    }

    return NextResponse.json({ simpleText });
  } catch (err) {
    console.error('AI simplify error:', err);
    return NextResponse.json({ simpleText: (await req.json()).text, _fallback: true, error: 'Simplification failed' });
  }
}