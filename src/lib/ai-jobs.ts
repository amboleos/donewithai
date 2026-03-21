import { createAIJob, getMappingsByRepo, type Commit, type Branch } from '@/lib/db';

/**
 * Calculate quarterly period from a date
 * Q1: Jan-Mar (months 0-2), Q2: Apr-Jun (3-5), Q3: Jul-Sep (6-8), Q4: Oct-Dec (9-11)
 */
export function getPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  if (month < 3) return `${year}-Q1`;  // Jan 1 - Mar 31
  if (month < 6) return `${year}-Q2`;  // Apr 1 - Jun 30
  if (month < 9) return `${year}-Q3`;  // Jul 1 - Sep 30
  return `${year}-Q4`;                 // Oct 1 - Dec 31
}

/**
 * Calculate points from lines changed
 * 200 lines = 1 point, rounded down
 */
export function calculatePoints(linesAdded: number, linesRemoved: number): number {
  return Math.floor((linesAdded + linesRemoved) / 200);
}

/**
 * Resolve GitHub username to internal user_id via user_mappings
 * Returns null if no mapping exists (unassigned job)
 */
export async function resolveUserId(repoId: number, githubAuthor: string): Promise<number | null> {
  const mappings = await getMappingsByRepo(repoId);
  const mapping = mappings.find(
    m => m.github_username.toLowerCase() === githubAuthor.toLowerCase()
  );
  return mapping?.user_id ?? null;
}

/**
 * Create an AI job from a commit
 */
export async function createAIJobFromCommit(
  commit: Commit,
  detectionMethod: 'keyword' | 'llm' | 'manual'
) {
  const points = calculatePoints(commit.lines_added, commit.lines_removed);
  if (points < 1) return null;

  const commitDate = new Date(commit.date);
  const userId = await resolveUserId(commit.repo_id, commit.author);

  return createAIJob(
    commit.repo_id,
    userId,
    getPeriod(commitDate),
    'commit',
    commit.id,
    points,
    detectionMethod,
    commitDate.toISOString()
  );
}

/**
 * Create an AI job from a branch (aggregates all commits in the branch)
 */
export async function createAIJobFromBranch(
  repoId: number,
  branch: Branch,
  allBranchCommits: Commit[],
  detectionMethod: 'manual'
) {
  // Aggregate lines from all commits in this branch
  const totalLinesAdded = allBranchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
  const totalLinesRemoved = allBranchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);

  const points = calculatePoints(totalLinesAdded, totalLinesRemoved);
  if (points < 1) return null;

  // Use branch creation date for period calculation
  const branchDate = new Date(branch.created_at);
  const userId = await resolveUserId(repoId, branch.created_by);

  return createAIJob(
    repoId,
    userId,
    getPeriod(branchDate),
    'branch',
    branch.id,
    points,
    detectionMethod,
    branchDate.toISOString()
  );
}
