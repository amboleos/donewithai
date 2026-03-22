import { NextRequest, NextResponse } from 'next/server';
import { AIDetector } from '@/lib/ai-detector';

export async function POST(req: NextRequest) {
  try {
    const { message, type = 'commit' } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const detector = new AIDetector(process.env.ZAI_API_KEY || '');
    const result = type === 'branch'
      ? await detector.detectFromBranchName(message)
      : await detector.detectFromCommitMessage(message);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
