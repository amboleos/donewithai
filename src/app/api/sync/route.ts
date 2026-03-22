import { NextRequest, NextResponse } from 'next/server';
import {
  getRepos,
  createRepo,
  upsertCommit,
  getCommitBySha,
  upsertBranch,
  updateRepoLastSynced,
  updateRepoError,
  getPendingCommitsForDiffstat,
  updateCommitLines,
  updateCommitAIDetection,
  updateBranchAIDetection,
  getBranchNamesByRepo,
  linkCommitToBranch,
  saveCodeAnalysis,
} from '@/lib/db';
import { CodeAnalyzer } from '@/lib/code-analyzer';
import { createProvider, parseRepoUrl, getEnvVarName, type GitProvider } from '@/lib/git';
import { AIDetector } from '@/lib/ai-detector';
import { eventEmitter } from '../events/route';
import { getServerSession } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const startTime = Date.now();
  try {
    const { url, fullSync } = await req.json();

    // Emit immediate starting event for UI feedback
    eventEmitter.emit({
      type: 'sync_starting',
      data: {
        message: fullSync ? 'Starting full sync...' : 'Starting incremental sync...',
        syncType: fullSync ? 'full' : 'incremental',
      },
    });

    // fullSync = true means fetch all commits (ignore last_synced) and re-run AI detection
    const isFullSync = fullSync === true;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Parse URL to detect provider
    let parsed;
    try {
      parsed = parseRepoUrl(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Unsupported git provider. Use GitHub or Bitbucket URL' },
        { status: 400 }
      );
    }

    const provider = createProvider(url);
    const detector = new AIDetector(process.env.ZAI_API_KEY);

    // Get repo info
    const repoInfo = await provider.getRepoInfo(url);

    // Determine token env var
    const tokenEnvVar = getEnvVarName(parsed.name, parsed.provider);

    // Create or get repo
    const existingRepos = await getRepos();
    let repo = existingRepos.find((r) => r.url === url);

    if (!repo) {
      repo = await createRepo(
        repoInfo.name,
        url,
        repoInfo.owner,
        parsed.provider,
        tokenEnvVar
      );
    }

    // Clear any previous sync error
    await updateRepoError(repo.id, null);

    // Fetch commits (only since last sync if available, unless fullSync is true)
    const lastSyncDate = isFullSync ? undefined : (repo.last_synced ? new Date(repo.last_synced) : undefined);
    console.log('[SYNC] Starting fetch commits...', isFullSync ? '(FULL SYNC - all history)' : (repo.last_synced ? 'since: ' + repo.last_synced : 'full sync'));

    // Emit fetching_commits event
    eventEmitter.emit({
      type: 'fetching_commits',
      data: { message: `Fetching commits from ${parsed.provider}...` },
    });

    const commits = await provider.getCommits(url, lastSyncDate);
    console.log('[SYNC] Fetched', commits.length, 'commits');

    // Emit sync started
    eventEmitter.emit({
      type: 'sync_started',
      data: {
        repoId: repo.id,
        repoName: repo.name,
        totalCommits: commits.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Emit processing_commits event
    eventEmitter.emit({
      type: 'processing_commits',
      data: {
        repoId: repo.id,
        processed: 0,
        total: commits.length,
        percentage: 0,
        currentCommit: 'Starting...',
      },
    });

    let aiJobsCreated = 0;
    let processedCount = 0;

    console.log('[SYNC] Starting commit loop, commits.length =', commits.length, 'isFullSync:', isFullSync);
    for (const commit of commits) {
      // For incremental sync, skip commits that are already fully processed (exist + AI detected)
      // But still process commits that exist but don't have AI detection yet
      if (!isFullSync && processedCount > 0) {
        const existingCommit = await getCommitBySha(repo.id, commit.sha);
        if (existingCommit && existingCommit.is_ai_detected !== null) {
          // Commit exists and AI detection done - skip
          continue;
        } else if (existingCommit) {
          // Commit exists but NO AI detection - will process below
          console.log('[SYNC] Found existing commit without AI:', commit.sha.substring(0, 8));
        }
      }

      const dbCommit = await upsertCommit(
        repo.id,
        commit.sha,
        commit.message,
        commit.author,
        commit.authorEmail,
        commit.date,
        commit.additions,
        commit.deletions
      );
      processedCount++;

      // Log progress every 100 commits
      if (processedCount % 100 === 0) {
        console.log('[SYNC] Processed', processedCount, '/', commits.length, 'commits...');
      }

      // Emit progress every 10 commits
      if (processedCount % 10 === 0 || processedCount === commits.length) {
        eventEmitter.emit({
          type: 'processing_commits',
          data: {
            repoId: repo.id,
            processed: processedCount,
            total: commits.length,
            percentage: Math.round((processedCount / commits.length) * 100),
            currentCommit: commit.message.split('\n')[0].substring(0, 50),
          },
        });
      }

      // RULE: No AI detection for commits before 2026-01-01
      const AI_CUTOFF_DATE = new Date('2026-01-01T00:00:00.000Z');
      if (commit.date < AI_CUTOFF_DATE) {
        // Mark as not-AI directly, skip LLM processing
        await updateCommitAIDetection(dbCommit.id, false, 1.0);
        continue;
      }

      // AI DETECTION: Keyword check → Code Analysis (if no keyword)
      const detection = await detector.detectFromCommitMessage(commit.message);

      if (detection.isAI && detection.confidence > 0.5) {
        // Fast path: keyword found
        console.log('[SYNC] ✅ AI COMMIT (keyword):', commit.sha.substring(0, 8), '| confidence:', detection.confidence.toFixed(2));
        await updateCommitAIDetection(dbCommit.id, true, detection.confidence);
        aiJobsCreated++;
        eventEmitter.emit({
          type: 'ai_tagged',
          data: {
            type: 'commit',
            id: dbCommit.id,
            userName: commit.author,
            reason: detection.reason,
          },
        });
      } else {
        // Slow path: No keyword found, run code analysis
        const codeAnalyzer = new CodeAnalyzer(process.env.ZAI_API_KEY);

        if (codeAnalyzer.canAnalyze() && provider.getCommitDiff) {
          try {
            eventEmitter.emit({
              type: 'code_analysis_started',
              data: { repoId: repo.id, sourceType: 'commit', sourceId: dbCommit.id },
            });

            const analysis = await codeAnalyzer.analyzeCommit(
              repo.url,
              commit.sha,
              provider,
              (stage, message) => {
                eventEmitter.emit({
                  type: 'code_analysis_progress',
                  data: { repoId: repo.id, sourceType: 'commit', sourceId: dbCommit.id, stage, message },
                });
              }
            );

            // Save analysis result
            await saveCodeAnalysis(
              repo.id,
              'commit',
              dbCommit.id,
              analysis.isAgentic,
              analysis.confidence,
              analysis.report,
              'z.ai-4.5-air',
              analysis.tokensUsed,
              analysis.durationMs
            );

            // Update commit AI detection based on analysis
            const isAI = analysis.isAgentic; // Agentic AI = AI detected
            await updateCommitAIDetection(dbCommit.id, isAI, analysis.confidence);

            if (isAI) {
              console.log('[SYNC] ✅ AI COMMIT (code analysis):', commit.sha.substring(0, 8), '| agentic:', analysis.isAgentic, '| confidence:', analysis.confidence.toFixed(2));
              aiJobsCreated++;
            }

            eventEmitter.emit({
              type: 'code_analysis_completed',
              data: {
                id: dbCommit.id,
                repoId: repo.id,
                sourceType: 'commit',
                sourceId: dbCommit.id,
                isAgentic: analysis.isAgentic,
                confidence: analysis.confidence,
                summary: analysis.report.summary,
              },
            });
          } catch (error: any) {
            console.error('[SYNC] Code analysis failed for', commit.sha.substring(0, 8), ':', error.message);
            // Fallback to keyword-based result
            await updateCommitAIDetection(dbCommit.id, false, detection.confidence);
          }
        } else {
          // No code analysis available, use keyword result
          await updateCommitAIDetection(dbCommit.id, false, detection.confidence);
        }
      }
    }
    console.log('[SYNC] Commit loop finished. Processed:', processedCount, 'AI commits found:', aiJobsCreated);
    console.log('[SYNC] Finished processing', commits.length, 'commits, created', aiJobsCreated, 'AI jobs');
    // Emit fetching_branches event
    eventEmitter.emit({
      type: 'fetching_branches',
      data: { page: 0, message: 'Fetching branches...' },
    });

    // Fetch branches (incremental - only add new ones)
    const branches = await provider.getBranches(url);
    console.log('[SYNC] Fetched', branches.length, 'branches total from API');

    // Get existing branch names for incremental sync
    const existingBranchNames = await getBranchNamesByRepo(repo.id);
    const existingBranchSet = new Set(existingBranchNames);
    console.log('[SYNC] Existing branches in DB:', existingBranchNames.length);

    // Log each branch name for debugging
    console.log('[SYNC] All branch names from API:', branches.map(b => b.name).join(', '));

    let insertedCount = 0;
    let newBranchCount = 0;
    let linkedCommitsCount = 0;

    for (const branch of branches) {
      // Check if branch already exists
      const isNewBranch = !existingBranchSet.has(branch.name);

      const dbBranch = await upsertBranch(
        repo.id,
        branch.name,
        'unknown',
        new Date()
      );
      insertedCount++;

      if (isNewBranch) {
        newBranchCount++;
      }

      // Link the branch's tip commit to the branch (for 2026 filtering)
      // This gives us at least one commit per branch to determine its activity date
      if (branch.commit?.sha) {
        const tipCommit = await getCommitBySha(repo.id, branch.commit.sha);
        if (tipCommit) {
          await linkCommitToBranch(dbBranch.id, tipCommit.id);
          linkedCommitsCount++;
        }
      }

      // Run AI detection on ALL branches (not just new ones)
      // But skip if already detected
      if (dbBranch.is_ai_detected === null) {
        const detection = await detector.detectFromBranchName(branch.name);
        if (detection.isAI && detection.confidence > 0.5) {
          console.log('[SYNC] ✅ AI BRANCH:', branch.name, '| confidence:', detection.confidence.toFixed(2), '|', detection.reason);
          await updateBranchAIDetection(dbBranch.id, true);
        } else {
          await updateBranchAIDetection(dbBranch.id, false);
        }
      }
    }
    console.log('[SYNC] Inserted/updated', insertedCount, 'branches in DB (', newBranchCount, ' new,', linkedCommitsCount, ' commits linked)');
    console.log('[SYNC] Inserted/updated', insertedCount, 'branches in DB (', newBranchCount, ' new)');

    // Emit branches_fetched event
    eventEmitter.emit({
      type: 'branches_fetched',
      data: { total: insertedCount, new: newBranchCount },
    });

    await updateRepoLastSynced(repo.id);

    // For Bitbucket, trigger background diffstat fetch
    if (parsed.provider === 'bitbucket' && typeof provider.getCommitDiffstat === 'function') {
      // Fire and forget - don't await
      fetchDiffstatInBackground(repo.id, url, provider).catch(err => {
        console.error('Background diffstat fetch error:', err);
      });
    }

    // Emit sync completed
    const duration = Date.now() - startTime;
    eventEmitter.emit({
      type: 'sync_completed',
      data: {
        repoId: repo.id,
        aiJobsFound: aiJobsCreated,
        duration,
        syncType: isFullSync ? 'full' : 'incremental',
      },
    });

    return NextResponse.json({ success: true, repo, aiJobsCreated });
  } catch (error: any) {
    console.error('Sync error:', error);

    // Emit sync_error event
    eventEmitter.emit({
      type: 'sync_error',
      data: {
        error: error.message || 'Unknown error',
      },
    });

    // If we have a repo ID, store the error
    if (error.message?.includes('Environment variable')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchDiffstatInBackground(
  repoId: number,
  url: string,
  provider: GitProvider
) {
  const pendingCommits = await getPendingCommitsForDiffstat(repoId);

  for (const commit of pendingCommits) {
    try {
      if (typeof provider.getCommitDiffstat === 'function') {
        const diffstat = await provider.getCommitDiffstat(url, commit.sha);
        await updateCommitLines(repoId, commit.sha, diffstat.additions, diffstat.deletions);
      }

      // Delay to respect rate limits (1000/hour = ~1 per 3.6 seconds)
      await new Promise(resolve => setTimeout(resolve, 4000));
    } catch (error) {
      console.error(`Failed to fetch diffstat for ${commit.sha}:`, error);
      await updateRepoError(
        repoId,
        `Failed to fetch diffstat for ${commit.sha.substring(0, 8)}`
      );
    }
  }

  // Clear error when complete
  await updateRepoError(repoId, null);
}
