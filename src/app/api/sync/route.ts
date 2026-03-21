import { NextRequest, NextResponse } from 'next/server';
import {
  getRepos,
  createRepo,
  upsertCommit,
  upsertBranch,
  updateRepoLastSynced,
  updateRepoError,
  getPendingCommitsForDiffstat,
  updateCommitLines,
  updateCommitAIDetection,
  updateBranchAIDetection,
} from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';
import { AIDetector } from '@/lib/ai-detector';
import type { GitProviderType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

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
    const detector = new AIDetector(process.env.ANTHROPIC_API_KEY);

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

    // Fetch commits
    const commits = await provider.getCommits(url);
    for (const commit of commits) {
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

      // Run AI detection on commits that don't have it
      if (dbCommit.is_ai_detected === null) {
        const detection = detector.detectFromCommitMessage(commit.message);
        if (detection.confidence > 0.5) {
          await updateCommitAIDetection(dbCommit.id, detection.isAI, detection.confidence);
        }
      }
    }

    // Fetch branches
    const branches = await provider.getBranches(url);
    for (const branch of branches) {
      const dbBranch = await upsertBranch(
        repo.id,
        branch.name,
        'unknown',
        new Date()
      );

      // Run AI detection on branches
      if (dbBranch.is_ai_detected === null) {
        const detection = detector.detectFromBranchName(branch.name);
        if (detection.confidence > 0.5) {
          await updateBranchAIDetection(dbBranch.id, detection.isAI);
        }
      }
    }

    await updateRepoLastSynced(repo.id);

    // For Bitbucket, trigger background diffstat fetch
    if (parsed.provider === 'bitbucket' && typeof provider.getCommitDiffstat === 'function') {
      // Fire and forget - don't await
      fetchDiffstatInBackground(repo.id, url, provider).catch(err => {
        console.error('Background diffstat fetch error:', err);
      });
    }

    return NextResponse.json({ success: true, repo });
  } catch (error: any) {
    console.error('Sync error:', error);

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
  provider: any
) {
  const pendingCommits = await getPendingCommitsForDiffstat(repoId);

  for (const commit of pendingCommits) {
    try {
      const diffstat = await provider.getCommitDiffstat(url, commit.sha);
      await updateCommitLines(repoId, commit.sha, diffstat.additions, diffstat.deletions);

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
