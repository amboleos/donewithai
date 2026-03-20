# Multi-Provider Git Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Bitbucket API support alongside existing GitHub integration through a unified provider interface.

**Architecture:** Create a GitProvider interface that both GitHub and Bitbucket implement. A factory function detects the provider from the URL and returns the appropriate provider instance. Bitbucket uses Repository Access Tokens stored as environment variables with auto-generated names (e.g., `BITBUCKET_TOKEN_ORTHERO5`).

**Tech Stack:** TypeScript, Next.js 16, Turso/SQLite, Octokit (GitHub), Bitbucket REST API v2

---

## Chunk 1: Database Schema and Types

This chunk adds the new database columns and TypeScript types needed for multi-provider support.

### Task 1: Add GitProviderType to shared types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/index.ts
export type GitProviderType = 'github' | 'bitbucket';

export interface ParsedRepoUrl {
  owner: string;
  name: string;
  provider: GitProviderType;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add GitProviderType and ParsedRepoUrl types"
```

### Task 2: Update Repo interface in db.ts

**Files:**
- Modify: `src/lib/db.ts:22-29`

- [ ] **Step 1: Update the Repo interface**

Find the `Repo` interface (around line 22) and replace it with:

```typescript
export interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: string;
  token_env_var: string | null;
  last_synced: string | null;
  sync_error: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Update createRepo function signature**

Find the `createRepo` function (around line 198) and update it:

```typescript
export async function createRepo(
  name: string,
  url: string,
  owner: string,
  provider: string = 'github',
  token_env_var: string | null = null
) {
  const result = await client.execute({
    sql: `
      INSERT INTO repos (name, url, owner, provider, token_env_var)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `,
    args: [name, url, owner, provider, token_env_var],
  });
  return result.rows[0] as unknown as Repo;
}
```

- [ ] **Step 3: Add updateRepoError function**

Add this new function after `updateRepoLastSynced`:

```typescript
export async function updateRepoError(id: number, error: string | null) {
  await client.execute({
    sql: `UPDATE repos SET sync_error = ? WHERE id = ?`,
    args: [error, id],
  });
}
```

- [ ] **Step 4: Add updateCommitLines function**

Add this new function after `updateCommitAIDetection`:

```typescript
export async function updateCommitLines(
  repoId: number,
  sha: string,
  linesAdded: number,
  linesRemoved: number
) {
  await client.execute({
    sql: `
      UPDATE commits
      SET lines_added = ?, lines_removed = ?
      WHERE repo_id = ? AND sha = ?
    `,
    args: [linesAdded, linesRemoved, repoId, sha],
  });
}
```

- [ ] **Step 5: Add getPendingCommitsForDiffstat function**

Add this new function after `updateCommitLines`:

```typescript
export async function getPendingCommitsForDiffstat(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT sha FROM commits
      WHERE repo_id = ? AND lines_added = 0 AND lines_removed = 0
      ORDER BY date DESC
    `,
    args: [repoId],
  });
  return result.rows as unknown as Array<{ sha: string }>;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: update Repo interface and add helper functions for multi-provider support"
```

### Task 3: Add database migration to initDb

**Files:**
- Modify: `src/lib/db.ts:90-100`

- [ ] **Step 1: Add new columns to repos table**

Find the `CREATE TABLE IF NOT EXISTS repos` statement (around line 92) and update it:

```typescript
  await client.execute(`
    CREATE TABLE IF NOT EXISTS repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      owner TEXT NOT NULL,
      provider TEXT DEFAULT 'github',
      token_env_var TEXT,
      sync_error TEXT,
      last_synced TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
```

- [ ] **Step 2: Add column migration for existing databases**

After the users table ALTER statements (around line 158), add:

```typescript
  // Add provider, token_env_var, sync_error to repos table if they don't exist
  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN provider TEXT DEFAULT 'github'`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN token_env_var TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  try {
    await client.execute(`ALTER TABLE repos ADD COLUMN sync_error TEXT`);
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      throw e;
    }
  }

  // Update existing repos to have provider='github'
  await client.execute({
    sql: `UPDATE repos SET provider = 'github' WHERE provider IS NULL`,
    args: [],
  });
```

- [ ] **Step 3: Add index for pending commits query**

After the existing indexes (around line 194), add:

```typescript
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_repos_provider ON repos(provider)`);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add database migration for multi-provider support"
```

---

## Chunk 2: Provider Interface and GitHub Provider

This chunk creates the base GitProvider interface and refactors the existing GitHub implementation to use it.

### Task 4: Create the GitProvider interface

**Files:**
- Create: `src/lib/git/provider.ts`

- [ ] **Step 1: Create the provider interface file**

```typescript
// src/lib/git/provider.ts
export type GitProviderType = 'github' | 'bitbucket';

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  authorEmail: string | null;
  date: Date;
  additions: number;
  deletions: number;
}

export interface GitBranch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface GitRepoInfo {
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

export interface GitProvider {
  getRepoInfo(url: string): Promise<GitRepoInfo>;
  getCommits(url: string, since?: Date): Promise<GitCommit[]>;
  getBranches(url: string): Promise<GitBranch[]>;
  getBranchCommitCount?(url: string, branchName: string): Promise<number>;
  getCommitDiffstat?(url: string, sha: string): Promise<{ additions: number; deletions: number }>;
  setupWebhook?(url: string, webhookUrl: string, secret?: string): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/git/provider.ts
git commit -m "feat: add GitProvider interface"
```

### Task 5: Create GitHub provider (refactor from github.ts)

**Files:**
- Create: `src/lib/git/github-provider.ts`
- Modify: `src/lib/github.ts` (keep for backward compatibility, re-export)

- [ ] **Step 1: Create the GitHub provider**

```typescript
// src/lib/git/github-provider.ts
import { Octokit } from 'octokit';
import type { GitProvider, GitCommit, GitBranch, GitRepoInfo } from './provider';

export class GitHubAPI implements GitProvider {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }

  async getRepoInfo(url: string): Promise<GitRepoInfo> {
    const { owner, repo } = this.parseRepoUrl(url);
    const { data } = await this.octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      name: data.name,
      owner: data.owner.login,
      defaultBranch: data.default_branch || 'main',
      private: data.private || false,
    };
  }

  async getCommits(
    url: string,
    since?: Date,
    perPage: number = 100
  ): Promise<GitCommit[]> {
    const { owner, repo } = this.parseRepoUrl(url);
    const commits: GitCommit[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: since?.toISOString(),
        per_page: perPage,
        page,
      });

      if (data.length === 0) break;

      for (const commit of data) {
        if (commit.commit?.message && commit.author?.login && commit.commit.author?.date) {
          commits.push({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.author.login,
            authorEmail: commit.commit.author?.email || null,
            date: new Date(commit.commit.author.date),
            additions: 0,
            deletions: 0,
          });
        }
      }

      if (data.length < perPage) break;
      page++;
    }

    // Get detailed stats for each commit (first 50)
    const detailedCommits = await Promise.all(
      commits.slice(0, 50).map(async (commit) => {
        try {
          const { data: detail } = await this.octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: commit.sha,
          });
          return {
            ...commit,
            additions: detail.stats?.additions || 0,
            deletions: detail.stats?.deletions || 0,
          };
        } catch {
          return commit;
        }
      })
    );

    return detailedCommits;
  }

  async getBranches(url: string): Promise<GitBranch[]> {
    const { owner, repo } = this.parseRepoUrl(url);
    const { data } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
    });

    return data.map((branch) => ({
      name: branch.name,
      commit: { sha: branch.commit.sha },
    }));
  }

  async getBranchCommitCount(
    url: string,
    branchName: string
  ): Promise<number> {
    const { owner, repo } = this.parseRepoUrl(url);
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: branchName,
        per_page: 1,
      });
      return data.length;
    } catch {
      return 0;
    }
  }

  async setupWebhook(url: string, webhookUrl: string, secret?: string): Promise<void> {
    const { owner, repo } = this.parseRepoUrl(url);
    await this.octokit.rest.repos.createWebhook({
      owner,
      repo,
      name: 'web',
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: secret || '',
      },
      events: ['push', 'create'],
      active: true,
    });
  }

  extractOwnerFromUrl(url: string): string {
    return this.parseRepoUrl(url).owner;
  }

  extractRepoNameFromUrl(url: string): string {
    return this.parseRepoUrl(url).repo;
  }
}
```

- [ ] **Step 2: Export parseGitHubRepoFromUrl utility from github-provider.ts**

Add this function at the end of github-provider.ts (before the closing brace):

```typescript
// Export utility function for backward compatibility
export function parseGitHubRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}
```

- [ ] **Step 3: Update github.ts to re-export for backward compatibility**

```typescript
// src/lib/github.ts
// Backward compatibility exports - re-export from new location
export { GitHubAPI, parseGitHubRepoFromUrl } from './git/github-provider';

// Re-export shared types for convenience
export type { GitCommit as GitHubCommit, GitBranch as GitHubBranch, GitRepoInfo as GitHubRepoInfo } from './git/provider';
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/git/github-provider.ts src/lib/github.ts
git commit -m "refactor: move GitHubAPI to git provider structure"
```

---

## Chunk 3: Bitbucket Provider

This chunk creates the Bitbucket provider implementation.

### Task 6: Create Bitbucket provider

**Files:**
- Create: `src/lib/git/bitbucket-provider.ts`

- [ ] **Step 1: Create the Bitbucket provider**

```typescript
// src/lib/git/bitbucket-provider.ts
import type { GitProvider, GitCommit, GitBranch, GitRepoInfo } from './provider';

const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0';
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // ms
const MAX_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, token: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}

interface BitbucketCommit {
  hash: string;
  message: string;
  author: {
    raw: string;
    user?: {
      display_name: string;
    };
  };
  date: string;
}

interface BitbucketBranch {
  name: string;
  target: {
    hash: string;
  };
}

interface BitbucketRepo {
  name: string;
  owner: {
    nickname: string;
  };
  mainbranch: {
    name: string;
  } | null;
  scm: string;
}

interface BitbucketPaginatedResponse<T> {
  values: T[];
  next?: string;
}

export class BitbucketAPI implements GitProvider {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private parseRepoUrl(url: string): { workspace: string; repoSlug: string } {
    // Match: bitbucket.org/workspace/repo or bitbucket.org:workspace/repo
    const match = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/);
    if (!match) {
      throw new Error('Invalid Bitbucket URL');
    }
    return { workspace: match[1], repoSlug: match[2] };
  }

  async getRepoInfo(url: string): Promise<GitRepoInfo> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}`;

    const response = await fetchWithRetry(apiUrl, this.token);
    const data: BitbucketRepo = await response.json();

    return {
      name: data.name,
      owner: data.owner.nickname,
      defaultBranch: data.mainbranch?.name || 'main',
      private: true, // Bitbucket API requires auth for private repos
    };
  }

  async getCommits(url: string, since?: Date): Promise<GitCommit[]> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    let apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/commits?pagelen=50`;

    if (since) {
      apiUrl += `&since=${since.toISOString()}`;
    }

    const commits: GitCommit[] = [];

    while (apiUrl) {
      const response = await fetchWithRetry(apiUrl, this.token);
      const data: BitbucketPaginatedResponse<BitbucketCommit> = await response.json();

      for (const commit of data.values) {
        // Extract author name from raw format (e.g., "Author Name <email@example.com>")
        const authorMatch = commit.author.raw.match(/^([^<]+)</);
        const authorName = commit.author.user?.display_name ||
                          (authorMatch ? authorMatch[1].trim() : commit.author.raw);

        commits.push({
          sha: commit.hash,
          message: commit.message,
          author: authorName,
          authorEmail: null, // Bitbucket API doesn't always provide email
          date: new Date(commit.date),
          additions: 0, // Filled in by background job
          deletions: 0, // Filled in by background job
        });
      }

      // Get next page
      apiUrl = data.next || '';
    }

    return commits;
  }

  async getBranches(url: string): Promise<GitBranch[]> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/refs/branches`;

    const response = await fetchWithRetry(apiUrl, this.token);
    const data: BitbucketPaginatedResponse<BitbucketBranch> = await response.json();

    return data.values.map(branch => ({
      name: branch.name,
      commit: { sha: branch.target.hash },
    }));
  }

  async getCommitDiffstat(url: string, sha: string): Promise<{ additions: number; deletions: number }> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/diffstat/${sha}`;

    try {
      const response = await fetchWithRetry(apiUrl, this.token);
      const data = await response.json();

      // Bitbucket diffstat response has diffstat objects with +/- counts
      let additions = 0;
      let deletions = 0;

      if (Array.isArray(data)) {
        for (const stat of data) {
          if (stat.diffstat) {
            additions += stat.diffstat.added || 0;
            deletions += stat.diffstat.removed || 0;
          }
        }
      }

      return { additions, deletions };
    } catch (error) {
      console.error(`Failed to fetch diffstat for ${sha}:`, error);
      return { additions: 0, deletions: 0 };
    }
  }

  // Note: getBranchCommitCount and setupWebhook are optional in GitProvider interface
  // Bitbucket provider doesn't implement them (out of scope)
}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/git/bitbucket-provider.ts
git commit -m "feat: add BitbucketAPI provider implementation"
```

---

## Chunk 4: Provider Factory and Utilities

This chunk creates the factory function and utility functions for provider detection and URL parsing.

### Task 7: Create provider factory and utilities

**Files:**
- Create: `src/lib/git/index.ts`

- [ ] **Step 1: Create the provider factory**

```typescript
// src/lib/git/index.ts
import { GitHubAPI } from './github-provider';
import { BitbucketAPI } from './bitbucket-provider';
import type { GitProvider } from './provider';
import type { GitProviderType, ParsedRepoUrl } from '@/types';

// URL patterns for provider detection
const GITHUB_PATTERN = /github\.com[:/]([^/]+)\/([^/.]+?)(\.git)?$/;
const BITBUCKET_PATTERN = /bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/;

export function detectProvider(url: string): GitProviderType {
  if (GITHUB_PATTERN.test(url)) return 'github';
  if (BITBUCKET_PATTERN.test(url)) return 'bitbucket';
  throw new Error('Unsupported git provider. URL must contain github.com or bitbucket.org');
}

export function parseRepoUrl(url: string): ParsedRepoUrl {
  const githubMatch = url.match(GITHUB_PATTERN);
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      name: githubMatch[2],
      provider: 'github',
    };
  }

  const bitbucketMatch = url.match(BITBUCKET_PATTERN);
  if (bitbucketMatch) {
    return {
      owner: bitbucketMatch[1],
      name: bitbucketMatch[2],
      provider: 'bitbucket',
    };
  }

  throw new Error('Invalid repository URL');
}

export function getEnvVarName(repoName: string, provider: GitProviderType): string | null {
  if (provider === 'github') return null;
  if (provider === 'bitbucket') {
    return `BITBUCKET_TOKEN_${repoName.toUpperCase()}`;
  }
  return null;
}

export function createProvider(url: string): GitProvider {
  const provider = detectProvider(url);

  if (provider === 'github') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }
    return new GitHubAPI(token);
  }

  if (provider === 'bitbucket') {
    const parsed = parseRepoUrl(url);
    const envVarName = getEnvVarName(parsed.name, 'bitbucket');
    const token = process.env[envVarName];

    if (!token) {
      throw new Error(`Environment variable ${envVarName} is not set`);
    }

    return new BitbucketAPI(token);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// Re-export types
export type { GitProvider, GitCommit, GitBranch, GitRepoInfo } from './provider';
export { GitHubAPI } from './github-provider';
export { BitbucketAPI } from './bitbucket-provider';
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/git/index.ts
git commit -m "feat: add provider factory and URL utilities"
```

---

## Chunk 5: Update API Routes

This chunk updates the API routes to use the new provider system.

### Task 8: Update sync route to use provider factory

**Files:**
- Modify: `src/app/api/sync/route.ts`

- [ ] **Step 1: Update imports**

Replace the imports at the top:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRepos, createRepo, upsertCommit, upsertBranch, updateRepoLastSynced, updateRepoError, getPendingCommitsForDiffstat, updateCommitLines, updateCommitAIDetection, updateBranchAIDetection } from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';
import { AIDetector } from '@/lib/ai-detector';
import type { GitProviderType } from '@/types';
```

Note: We now import `updateCommitAIDetection` and `updateBranchAIDetection` from `@/lib/db` instead of redefining them locally.

- [ ] **Step 2: Update the POST handler**

Replace the entire POST function:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sync/route.ts
git commit -m "feat: update sync route to use provider factory"
```

### Task 9: Update repos route to accept provider info

**Files:**
- Modify: `src/app/api/repos/route.ts`

- [ ] **Step 1: Update imports**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRepos, createRepo, deleteRepo } from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';
import type { GitProviderType } from '@/types';
```

- [ ] **Step 2: Update POST handler**

Replace the POST function:

```typescript
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

    // Check if repo already exists
    const existingRepos = await getRepos();
    const existing = existingRepos.find((r) => r.url === url);
    if (existing) {
      return NextResponse.json({ repo: existing }, { status: 200 });
    }

    // Verify we can access the repo
    try {
      const provider = createProvider(url);
      await provider.getRepoInfo(url);
    } catch (error: any) {
      if (error.message?.includes('Environment variable')) {
        // For Bitbucket, allow creating the repo even if token is missing
        // The sync will fail later with a clear error
      } else {
        throw error;
      }
    }

    const tokenEnvVar = getEnvVarName(parsed.name, parsed.provider);

    const repo = await createRepo(
      parsed.name,
      url,
      parsed.owner,
      parsed.provider,
      tokenEnvVar
    );

    return NextResponse.json({ repo }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/repos/route.ts
git commit -m "feat: update repos route to support multi-provider"
```

---

## Chunk 6: Update UI Components

This chunk updates the UI components to support Bitbucket URLs and display provider information.

### Task 10: Update AddRepoDialog for Bitbucket support

**Files:**
- Modify: `src/components/dashboard/add-repo-dialog.tsx`

- [ ] **Step 1: Add state for provider detection**

Add after the existing state declarations:

```typescript
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<'github' | 'bitbucket' | null>(null);
  const [tokenEnvVar, setTokenEnvVar] = useState<string>('');
```

- [ ] **Step 2: Add URL parsing effect**

Add after the state declarations:

```typescript
  // Detect provider and generate token env var when URL changes
  useEffect(() => {
    if (!url) {
      setDetectedProvider(null);
      setTokenEnvVar('');
      return;
    }

    // Check for GitHub
    const githubMatch = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
    if (githubMatch) {
      setDetectedProvider('github');
      setTokenEnvVar('');
      return;
    }

    // Check for Bitbucket
    const bitbucketMatch = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/);
    if (bitbucketMatch) {
      setDetectedProvider('bitbucket');
      const repoName = bitbucketMatch[2];
      setTokenEnvVar(`BITBUCKET_TOKEN_${repoName.toUpperCase()}`);
      return;
    }

    setDetectedProvider(null);
    setTokenEnvVar('');
  }, [url]);
```

- [ ] **Step 3: Update the import to include useEffect**

```typescript
import { useState, useEffect } from 'react';
```

- [ ] **Step 4: Update validation logic**

Replace the validation in handleSubmit:

```typescript
    // Validate URL
    const githubPattern = /github\.com[:/]([^/]+)\/([^/]+)/;
    const bitbucketPattern = /bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/;

    if (!githubPattern.test(url) && !bitbucketPattern.test(url)) {
      toast.error('Please enter a valid GitHub or Bitbucket repository URL');
      return;
    }
```

- [ ] **Step 5: Update the form JSX**

Replace the form content:

```typescript
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Repository URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://github.com/owner/repo or https://bitbucket.org/workspace/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-slate-500">
              Supports GitHub and Bitbucket (HTTPS and SSH formats)
            </p>
          </div>

          {detectedProvider === 'bitbucket' && tokenEnvVar && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Configure this environment variable in Vercel:
              </p>
              <code className="text-xs bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded mt-1 block">
                {tokenEnvVar}
              </code>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Repository'}
            </Button>
          </div>
        </form>
```

- [ ] **Step 6: Update DialogDescription**

```typescript
          <DialogDescription>
            Enter the URL of a GitHub or Bitbucket repository to track
          </DialogDescription>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/add-repo-dialog.tsx
git commit -m "feat: add Bitbucket support to AddRepoDialog"
```

### Task 11: Update RepoList to show provider badge

**Files:**
- Modify: `src/components/dashboard/repo-list.tsx`

- [ ] **Step 1: Update Repo interface**

Add to the Repo interface:

```typescript
interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: string;
  last_synced: Date | null;
  created_at: Date;
  sync_error: string | null;
}
```

- [ ] **Step 2: Add icon imports**

Update the import:

```typescript
import { Trash2, GitBranch, RefreshCw, Calendar, Container, AlertTriangle } from 'lucide-react';
```

- [ ] **Step 3: Add helper to get provider icon**

Add before the return statement:

```typescript
  const getProviderIcon = (provider?: string) => {
    if (provider === 'bitbucket') {
      return <Container className="h-4 w-4 text-blue-600" />;
    }
    return <GitBranch className="h-4 w-4 text-indigo-600" />;
  };
```

- [ ] **Step 4: Update the card header JSX**

Replace the card header section:

```typescript
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getProviderIcon(repo.provider)}
                <CardTitle className="text-lg">{repo.name}</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {repo.sync_error && (
                  <AlertTriangle
                    className="h-4 w-4 text-amber-500"
                    title={repo.sync_error}
                  />
                )}
                <Badge variant="outline">{repo.owner}</Badge>
              </div>
            </div>
            <CardDescription className="line-clamp-1">
              {repo.url}
            </CardDescription>
          </CardHeader>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/repo-list.tsx
git commit -m "feat: add provider badge and error indicator to RepoList"
```

### Task 12: Update dashboard page to pass provider props

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update Repo interface**

Add to the Repo interface:

```typescript
interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: string;
  last_synced: Date | null;
  created_at: Date;
  sync_error: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: update dashboard Repo interface for provider support"
```

---

## Chunk 7: Testing and Verification

This chunk covers testing the implementation.

### Task 13: Test GitHub integration still works

- [ ] **Step 1: Start the development server**

```bash
npm run dev
```

- [ ] **Step 2: Add a GitHub repository**

1. Navigate to the dashboard
2. Click "Add Repository"
3. Enter a GitHub URL (e.g., `https://github.com/owner/repo`)
4. Verify the repository is added

- [ ] **Step 3: Sync the GitHub repository**

1. Click the sync button on the repository card
2. Verify commits and branches are fetched
3. Check that lines_added/lines_removed have values

Expected: GitHub functionality works exactly as before

### Task 14: Test Bitbucket integration (requires Bitbucket repo and token)

- [ ] **Step 1: Configure Bitbucket token**

Add the token to your local environment:

```bash
# In your .env.local file
BITBUCKET_TOKEN_ORTHERO5=your_token_here
```

- [ ] **Step 2: Add a Bitbucket repository**

1. Navigate to the dashboard
2. Click "Add Repository"
3. Enter a Bitbucket URL (e.g., `https://bitbucket.org/workspace/repo`)
4. Verify the info message shows the correct env var name
5. Add the repository

- [ ] **Step 3: Sync the Bitbucket repository**

1. Click the sync button
2. Verify commits are fetched initially with 0 additions/deletions
3. Wait ~30 seconds and check that values are updated (background job)

Expected: Bitbucket sync completes and lines data is populated

### Task 15: Test error handling

- [ ] **Step 1: Test invalid URL**

1. Try adding `https://gitlab.com/owner/repo`
2. Verify error message shows "Unsupported git provider"

- [ ] **Step 2: Test missing Bitbucket token**

1. Remove the Bitbucket token from env
2. Try syncing a Bitbucket repo
3. Verify sync_error is set and warning icon appears

### Task 16: Deploy and verify

- [ ] **Step 1: Commit all changes**

```bash
git status
git add .
git commit -m "feat: complete multi-provider Git integration"
```

- [ ] **Step 2: Deploy to Vercel**

```bash
vercel --prod
```

- [ ] **Step 3: Configure environment variables in Vercel**

1. Add Bitbucket token(s) to Vercel environment variables
2. Redeploy if needed

- [ ] **Step 4: Test in production**

1. Add a Bitbucket repository in production
2. Verify sync works end-to-end

---

## Chunk 8: Cleanup and Documentation

This chunk handles cleanup of old files and documentation updates.

### Task 17: Delete old github.ts after verification

**Files:**
- Delete: `src/lib/github.ts` (only after confirming all imports are updated)

- [ ] **Step 1: Verify no direct imports of github.ts remain**

```bash
grep -r "from '@/lib/github'" src/
```

Expected: No results (all imports should use `@/lib/git`)

- [ ] **Step 2: Delete the old file**

```bash
rm src/lib/github.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/github.ts
git commit -m "refactor: remove deprecated github.ts file"
```

### Task 18: Update README documentation

**Files:**
- Modify: `README.md` (if it exists)

- [ ] **Step 1: Add Bitbucket setup section**

```markdown
## Adding a Bitbucket Repository

1. Create a Repository Access Token in Bitbucket
2. Add the token as an environment variable in Vercel:
   - Name format: `BITBUCKET_TOKEN_{REPONAME}` (e.g., `BITBUCKET_TOKEN_ORTHERO5`)
3. Add the repository URL in the dashboard
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Bitbucket setup instructions"
```

### Task 19: Final verification and merge

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

- [ ] **Step 2: Check TypeScript errors**

```bash
npm run build
```

- [ ] **Step 3: Create pull request**

```bash
git push origin multi-provider-git
```

Then create a PR in GitHub with:
- Title: "feat: Add Bitbucket support with multi-provider Git integration"
- Description: Reference the design spec in `docs/superpowers/specs/2026-03-21-multi-provider-git-design.md`

---

## Rollback Plan

If deployment fails:

1. **Database rollback:** New columns are backward compatible with defaults, no action needed
2. **Code rollback:** Revert to previous commit
3. **GitHub repos:** Continue working with `provider='github'` default
4. **No data loss:** New columns are nullable/have defaults

To rollback: `git revert <commit-hash>` and deploy
