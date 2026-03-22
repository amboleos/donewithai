// src/app/api/events/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SSE event type definitions
export type SyncEvent =
  | { type: 'sync_starting'; data: { message: string; syncType: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'sync_started'; data: { repoId: number; repoName: string; totalCommits: number; timestamp: string } }
  | { type: 'fetching_commits'; data: { message: string } }
  | { type: 'processing_commits'; data: { repoId: number; processed: number; total: number; percentage: number; currentCommit: string } }
  | { type: 'fetching_branches'; data: { page: number; message: string } }
  | { type: 'branches_fetched'; data: { total: number; new: number } }
  | { type: 'sync_completed'; data: { repoId: number; aiJobsFound: number; duration: number; syncType?: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'ai_tagged'; data: { type: 'commit' | 'branch'; id: number; userName: string; reason?: string } }
  | { type: 'sync_error'; data: { error: string; syncType?: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'ai_recheck_progress'; data: { repoId: number; processed: number; total: number; aiFound: number } }
  // Code analysis events
  | { type: 'code_analysis_started'; data: { repoId: number; sourceType: 'commit' | 'branch'; sourceId: number } }
  | { type: 'code_analysis_progress'; data: { repoId: number; sourceType: 'commit' | 'branch'; sourceId: number; stage: string; message: string } }
  | { type: 'code_analysis_completed'; data: { id: number; repoId: number; sourceType: 'commit' | 'branch'; sourceId: number; isAgentic: boolean; confidence: number; summary: string } }
  | { type: 'code_analysis_error'; data: { error: string } };

// Global event emitter for SSE
class EventEmitter {
  private controllers: Set<ReadableStreamDefaultController> = new Set();

  addController(controller: ReadableStreamDefaultController) {
    this.controllers.add(controller);
    return () => this.controllers.delete(controller);
  }

  emit(event: SyncEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const controller of this.controllers) {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch (e) {
        this.controllers.delete(controller);
      }
    }
  }
}

export const eventEmitter = new EventEmitter();

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const remove = eventEmitter.addController(controller);

      // Send initial connection message
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
        } catch (e) {
          clearInterval(keepAlive);
          remove();
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        remove();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
