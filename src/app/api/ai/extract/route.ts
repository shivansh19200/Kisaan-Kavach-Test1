import { NextRequest, NextResponse } from 'next/server';
import { extractLabData, isRecordedAI, RECORDED_EXTRACTION } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const result = await extractLabData(text);

    if (isRecordedAI(result)) {
      return NextResponse.json({ ...RECORDED_EXTRACTION, _recorded: true });
    }

    if ('_error' in result) {
      return NextResponse.json({ error: result.error || 'Extraction failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('AI extract error:', err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}