import { NextRequest, NextResponse } from 'next/server';
import {
  getCommitsForBranch,
  getRepoById,
  getBranchById,
  upsertCommit,
  linkCommitToBranch,
  clearBranchCommits,
} from '@/lib/db';
import { createProvider } from '@/lib/git';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params;
    const repoId = parseInt(id);
    const branchIdNum = parseInt(branchId);

    // Check for refresh parameter
    const url = new URL(req.url);
    const refresh = url.searchParams.get('refresh') === 'true';

    // First check if we have cached commits in branch_commits (unless refresh requested)
    if (!refresh) {
      const cachedCommits = await getCommitsForBranch(branchIdNum);
      if (cachedCommits.length > 0) {
        return NextResponse.json({ commits: cachedCommits });
      }
    } else {
      // Clear old cache before refresh
      await clearBranchCommits(branchIdNum);
    }

    // No cached commits - fetch from Git provider
    const repo = await getRepoById(repoId);
    if (!repo) {
      return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
    }

    const branch = await getBranchById(branchIdNum);
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Create the Git provider (reads token from env vars internally)
    const provider = createProvider(repo.url);

    // Check if provider supports getCommitsForBranch
    if (!provider.getCommitsForBranch) {
      return NextResponse.json({ commits: [] });
    }

    // Fetch commits for this branch from Git provider
    const gitCommits = await provider.getCommitsForBranch(repo.url, branch.name);

    // Cache commits in DB and link to branch
    const commits = [];
    for (const gc of gitCommits) {
      // Upsert commit to DB
      const dbCommit = await upsertCommit(
        repoId,
        gc.sha,
        gc.message,
        gc.author,
        gc.authorEmail,
        gc.date,
        gc.additions,
        gc.deletions
      );

      // Link commit to branch
      await linkCommitToBranch(branchIdNum, dbCommit.id);

      commits.push({
        ...dbCommit,
        repo_name: repo.name,
      });
    }

    console.log(`[API] Cached ${commits.length} commits for branch ${branch.name}`);

    return NextResponse.json({ commits });
  } catch (error: any) {
    console.error('[API] Error fetching branch commits:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
