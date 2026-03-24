import { NextRequest, NextResponse } from 'next/server';
import {
  getCommitsForBranch,
  getRepoById,
  getBranchById,
  upsertCommit,
  linkCommitToBranch,
} from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { id, branchId } = await params;
    const repoId = parseInt(id);
    const branchIdNum = parseInt(branchId);

    // First check if we have cached commits in branch_commits
    const cachedCommits = await getCommitsForBranch(branchIdNum);

    if (cachedCommits.length > 0) {
      // Return cached commits
      return NextResponse.json({ commits: cachedCommits });
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

    // Parse repo URL to get provider info
    const parsed = parseRepoUrl(repo.url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid repo URL' }, { status: 400 });
    }

    // Get the token env var and token
    const tokenEnvVar = getEnvVarName(parsed.name, parsed.provider);
    const token = tokenEnvVar ? process.env[tokenEnvVar] : process.env.GITHUB_TOKEN;

    if (!token) {
      // Return empty commits if no token - can't fetch from provider
      return NextResponse.json({ commits: [] });
    }

    const provider = createProvider(repo.url, token);

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
