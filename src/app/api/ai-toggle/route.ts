import { NextRequest, NextResponse } from 'next/server';
import {
  updateCommitAIDetectionManual,
  updateBranchAIDetectionManual,
  getBranchById,
  getCommitsByBranchId,
  deleteQueueItemsForSource,
  hasExistingJob,
  createAIJob,
  getCommitById,
} from '@/lib/db';
import { getPeriod, calculatePoints, resolveUserId } from '@/lib/ai-jobs';
import { eventEmitter } from '../events/route';

export async function POST(req: NextRequest) {
  try {
    const { type, id, isAI, repoId } = await req.json();

    if (type === 'commit') {
      // Remove from queue if pending (manual toggle wins)
      await deleteQueueItemsForSource('commit', id);

      await updateCommitAIDetectionManual(id, isAI);

      // If marking as AI, create or update AI job
      if (isAI) {
        const commit = await getCommitById(id);
        if (!commit) {
          return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
        }

        const points = calculatePoints(commit.lines_added, commit.lines_removed);
        if (points >= 1) {
          const commitDate = new Date(commit.date);
          const userId = await resolveUserId(commit.repo_id, commit.author);

          // Create or update job with manual detection method
          await createAIJob(
            commit.repo_id,
            userId,
            getPeriod(commitDate),
            'commit',
            id,
            points,
            'manual',
            commitDate.toISOString()
          );
        }
      }

      eventEmitter.emit({
        type: 'ai_tagged',
        data: { type: 'commit', id, userName: 'admin' },
      });
    } else if (type === 'branch') {
      // Remove from queue if pending
      await deleteQueueItemsForSource('branch', id);

      await updateBranchAIDetectionManual(id, isAI);

      // When marking branch as AI, create aggregated job
      if (isAI) {
        const branch = await getBranchById(id);
        if (!branch) {
          return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // Get all commits linked to this branch
        const branchCommits = await getCommitsByBranchId(id);

        if (branchCommits.length > 0) {
          const totalLinesAdded = branchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
          const totalLinesRemoved = branchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
          const points = calculatePoints(totalLinesAdded, totalLinesRemoved);

          if (points >= 1) {
            const branchDate = new Date(branch.created_at);
            const userId = await resolveUserId(branch.repo_id, branch.created_by);

            // Create AI job (ON CONFLICT handles both create and update)
            await createAIJob(
              branch.repo_id,
              userId,
              getPeriod(branchDate),
              'branch',
              id,
              points,
              'manual',
              branchDate.toISOString()
            );
          }

          eventEmitter.emit({
            type: 'ai_tagged',
            data: { type: 'branch', id, userName: branch.created_by },
          });
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
