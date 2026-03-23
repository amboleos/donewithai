import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { getRepos } from '@/lib/db';
import { createProvider } from '@/lib/git';
import { AIDetector } from '@/lib/ai-detector';
import { CodeAnalyzer } from '@/lib/code-analyzer';
import { updateCommitAIDetection, updateBranchAIDetection, getAllCommitsByRepo, getBranchesByRepo, saveCodeAnalysis } from '@/lib/db';
import { eventEmitter } from '../../events/route';

export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Emit immediate starting event for UI feedback
  eventEmitter.emit({
    type: 'sync_starting',
    data: {
      message: 'Starting AI recheck for all commits...',
      syncType: 'ai_recheck',
    },
  });

  try {
    const { repoId } = await req.json();

    if (!repoId) {
      return NextResponse.json({ error: 'repoId required' }, { status: 400 });
    }

    const repos = await getRepos();
    const repo = repos.find((r) => r.id === parseInt(repoId));

    if (!repo) {
      return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
    }

    console.log('[AI RECHECK] Starting for repo:', repo.name);

    // AI cutoff date - only check 2026+ commits
    const AI_CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z');

    // Re-check commits (only 2026+, skip already marked as AI)
    const commits = await getAllCommitsByRepo(repo.id); // Get ALL commits
    const detector = new AIDetector(process.env.ZAI_API_KEY);
    const codeAnalyzer = new CodeAnalyzer(process.env.ZAI_API_KEY);
    const provider = createProvider(repo.url);

    let commitsChecked = 0;
    let commitsMarkedAI = 0;
    let commitsMarkedNotAI = 0;
    let commitsSkipped = 0; // Already AI

    console.log('[AI RECHECK] Total commits in DB:', commits.length);

    for (const commit of commits) {
      const commitDate = new Date(commit.date);

      // Skip if before 2026
      if (commitDate < AI_CUTOFF_DATE) {
        // Mark as not-AI directly if null
        if (commit.is_ai_detected === null) {
          await updateCommitAIDetection(commit.id, false, 1.0);
          commitsMarkedNotAI++;
        }
        continue;
      }

      // Skip if already marked as AI (don't re-check AI commits)
      if (commit.is_ai_detected === 1) {
        commitsSkipped++;
        continue;
      }

      commitsChecked++;

      // Check AI by commit message (keywords → LLM → pattern fallback)
      const detection = await detector.detectFromCommitMessage(commit.message);

      if (detection.isAI && detection.confidence > 0.5) {
        console.log('[AI RECHECK] ✅ AI COMMIT FOUND:', commit.sha.substring(0, 8), '|', commit.message.substring(0, 60), '| confidence:', detection.confidence.toFixed(2), '| reason:', detection.reason);
        await updateCommitAIDetection(commit.id, true, detection.confidence);
        commitsMarkedAI++;
      } else {
        // No keyword found - run code analysis (same as sync route)
        if (codeAnalyzer.canAnalyze() && provider.getCommitDiff) {
          try {
            eventEmitter.emit({
              type: 'code_analysis_started',
              data: { repoId: repo.id, sourceType: 'commit', sourceId: commit.id },
            });

            const analysis = await codeAnalyzer.analyzeCommit(
              repo.url,
              commit.sha,
              provider,
              (stage, message) => {
                eventEmitter.emit({
                  type: 'code_analysis_progress',
                  data: { repoId: repo.id, sourceType: 'commit', sourceId: commit.id, stage, message },
                });
              }
            );

            // Save analysis result
            await saveCodeAnalysis(
              repo.id,
              'commit',
              commit.id,
              analysis.isAgentic,
              analysis.confidence,
              analysis.report,
              'z.ai-4.5-air',
              analysis.tokensUsed,
              analysis.durationMs
            );

            // Update commit AI detection based on analysis
            const isAI = analysis.isAgentic; // Agentic AI = AI detected
            await updateCommitAIDetection(commit.id, isAI, analysis.confidence);

            if (isAI) {
              console.log('[AI RECHECK] ✅ AI COMMIT (code analysis):', commit.sha.substring(0, 8), '| agentic:', analysis.isAgentic, '| confidence:', analysis.confidence.toFixed(2));
              commitsMarkedAI++;
            } else {
              commitsMarkedNotAI++;
            }

            eventEmitter.emit({
              type: 'code_analysis_completed',
              data: {
                id: commit.id,
                repoId: repo.id,
                sourceType: 'commit',
                sourceId: commit.id,
                isAgentic: analysis.isAgentic,
                confidence: analysis.confidence,
                summary: analysis.report.summary,
              },
            });
          } catch (error: any) {
            console.error('[AI RECHECK] Code analysis failed for', commit.sha.substring(0, 8), ':', error.message);
            // Fallback to keyword-based result
            await updateCommitAIDetection(commit.id, false, detection.confidence);
            commitsMarkedNotAI++;
          }
        } else {
          // No code analysis available, use keyword result
          await updateCommitAIDetection(commit.id, false, detection.confidence);
          commitsMarkedNotAI++;
        }
      }

      // Emit progress every 50 commits
      if (commitsChecked % 50 === 0) {
        eventEmitter.emit({
          type: 'ai_recheck_progress',
          data: {
            repoId: repo.id,
            processed: commitsChecked,
            total: commits.length,
            aiFound: commitsMarkedAI,
          },
        });
      }
    }

    // Re-check branches (only if not already marked as AI)
    const branches = await getBranchesByRepo(repo.id);
    let branchesChecked = 0;
    let branchesMarkedAI = 0;
    let branchesMarkedNotAI = 0;
    let branchesSkipped = 0; // Already AI

    console.log('[AI RECHECK] Total branches in DB:', branches.length);

    for (const branch of branches) {
      // Skip if already marked as AI
      if (branch.is_ai_detected === 1) {
        branchesSkipped++;
        continue;
      }

      branchesChecked++;

      const detection = await detector.detectFromBranchName(branch.name);

      if (detection.isAI && detection.confidence > 0.5) {
        console.log('[AI RECHECK] ✅ AI BRANCH FOUND:', branch.name, '| confidence:', detection.confidence.toFixed(2), '| reason:', detection.reason);
        await updateBranchAIDetection(branch.id, true);
        branchesMarkedAI++;
      } else {
        await updateBranchAIDetection(branch.id, false);
        branchesMarkedNotAI++;
      }
    }

    console.log('[AI RECHECK] COMPLETE!');
    console.log('[AI RECHECK] Commits - Checked:', commitsChecked, 'AI:', commitsMarkedAI, 'Not AI:', commitsMarkedNotAI, 'Skipped (already AI):', commitsSkipped);
    console.log('[AI RECHECK] Branches - Checked:', branchesChecked, 'AI:', branchesMarkedAI, 'Not AI:', branchesMarkedNotAI, 'Skipped (already AI):', branchesSkipped);

    // Emit sync completed
    eventEmitter.emit({
      type: 'sync_completed',
      data: {
        repoId: repo.id,
        aiJobsFound: commitsMarkedAI + branchesMarkedAI,
        duration: 0,
        syncType: 'ai_recheck',
      },
    });

    return NextResponse.json({
      success: true,
      commits: {
        checked: commitsChecked,
        markedAI: commitsMarkedAI,
        markedNotAI: commitsMarkedNotAI,
        skipped: commitsSkipped,
      },
      branches: {
        checked: branchesChecked,
        markedAI: branchesMarkedAI,
        markedNotAI: branchesMarkedNotAI,
        skipped: branchesSkipped,
      },
    });
  } catch (error: any) {
    console.error('[AI RECHECK] Error:', error);

    // Emit sync_error event
    eventEmitter.emit({
      type: 'sync_error',
      data: {
        error: error.message || 'Unknown error',
        syncType: 'ai_recheck',
      },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
