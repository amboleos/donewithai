import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { AIQueueProcessor } from '@/lib/ai-queue';
import { getPendingQueueItems } from '@/lib/db';

const processor = new AIQueueProcessor();
let isProcessing = false;

export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isProcessing) {
    return NextResponse.json({ message: 'Queue already being processed' }, { status: 409 });
  }

  isProcessing = true;

  try {
    const items = await getPendingQueueItems(10);
    const processed = await processor.processBatch(items as any);

    return NextResponse.json({ processed, total: items.length });
  } finally {
    isProcessing = false;
  }
}
