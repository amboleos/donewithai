# Multi-Provider Git Integration Design

> **Status:** Approved
> **Created:** 2026-03-21
> **Author:** Claude (with user collaboration)

## Overview

Extend DoneWithAI to support both GitHub and Bitbucket repositories through a unified provider interface. The system uses provider-specific APIs (Octokit for GitHub, Bitbucket REST API v2) and stores authentication via environment variables.

## Goals

1. Add Bitbucket Cloud API support alongside existing GitHub integration
2. Enable private repository access using Repository Access Tokens
3. Use auto-named environment variables for Bitbucket tokens (`BITBUCKET_TOKEN_{REPONAME}`)
4. Handle Bitbucket's lack of diffstat data in commits endpoint via async background job
5. Maintain existing GitHub functionality without breaking changes

## Non-Goals

- Support for GitLab, Azure DevOps, or other providers (out of scope for now)
- Bitbucket Server/On-Premise (only Bitbucket Cloud API v2)
- OAuth flows (using repository access tokens stored in environment variables)
- Modifying existing GitHub repo data structure beyond new columns

## Architecture

### Component Structure

```
src/lib/git/
├── provider.ts           # Base GitProvider interface
├── github-provider.ts    # Existing GitHubAPI refactored to implement interface
├── bitbucket-provider.ts # New Bitbucket API implementation
└── index.ts              # Factory function that creates provider based on URL
```

### Type System

```typescript
// Shared types - both providers return these
interface GitCommit {
  sha: string;              // Using 'sha' to match existing GitHub API
  message: string;
  author: string;
  authorEmail: string | null;
  date: Date;
  additions: number;        // 0 initially for Bitbucket, filled async
  deletions: number;
}

interface GitBranch {
  name: string;
  commit: {
    sha: string;
  };
}

interface GitRepoInfo {
  name: string;
  owner: string;
  defaultBranch: string;
  private: boolean;
}

type GitProviderType = 'github' | 'bitbucket';

// Provider interface
interface GitProvider {
  getRepoInfo(url: string): Promise<GitRepoInfo>;
  getCommits(url: string, since?: Date): Promise<GitCommit[]>;
  getBranches(url: string): Promise<GitBranch[]>;
  getBranchCommitCount?(url: string, branchName: string): Promise<number>;
  getCommitDiffstat?(url: string, sha: string): Promise<{additions: number, deletions: number}>;
  setupWebhook?(url: string, webhookUrl: string): Promise<void>;
}
```

**Note:** `getBranchCommitCount` and `setupWebhook` are optional methods. GitHub provider implements both; Bitbucket provider only implements required methods (webhooks and branch count are out of scope for Bitbucket).

### Database Schema Changes

```sql
ALTER TABLE repos ADD COLUMN provider TEXT DEFAULT 'github';
ALTER TABLE repos ADD COLUMN token_env_var TEXT;
ALTER TABLE repos ADD COLUMN sync_error TEXT;

-- Update existing repos
UPDATE repos SET provider = 'github' WHERE provider IS NULL;

-- Create index for background job queries
CREATE INDEX idx_commits_lines_pending ON commits(sha, additions, deletions)
WHERE additions = 0 AND deletions = 0;
```

| Column        | Type | Example                          |
|---------------|------|----------------------------------|
| provider      | TEXT | 'github' or 'bitbucket'          |
| token_env_var | TEXT | 'BITBUCKET_TOKEN_ORTHERO5' or NULL |
| sync_error    | TEXT | Error message from last sync (NULL if successful) |

**TypeScript Interface Update:**

```typescript
// In src/lib/db.ts
interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: GitProviderType;
  token_env_var: string | null;
  last_synced: Date | null;
  sync_error: string | null;
  created_at: Date;
}

// Updated function signature
async function createRepo(
  name: string,
  url: string,
  owner: string,
  provider: GitProviderType = 'github',
  token_env_var: string | null = null
): Promise<Repo>
```

- GitHub repos: `token_env_var` is NULL (uses global `GITHUB_TOKEN`)
- Bitbucket repos: `token_env_var` stores the env var name
- `sync_error` stores last sync error for UI display (NULL = successful)

## Provider Detection

```typescript
// URL patterns - using regex for accurate matching
const GITHUB_PATTERN = /github\.com[:/]([^/]+)\/([^/.]+?)(\.git)?$/;
const BITBUCKET_PATTERN = /bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/;

function detectProvider(url: string): GitProviderType {
  if (GITHUB_PATTERN.test(url)) return 'github';
  if (BITBUCKET_PATTERN.test(url)) return 'bitbucket';
  throw new Error('Unsupported git provider. URL must contain github.com or bitbucket.org');
}

interface ParsedRepoUrl {
  owner: string;
  name: string;
  provider: GitProviderType;
}

function parseRepoUrl(url: string): ParsedRepoUrl {
  const githubMatch = url.match(GITHUB_PATTERN);
  if (githubMatch) {
    return { owner: githubMatch[1], name: githubMatch[2], provider: 'github' };
  }

  const bitbucketMatch = url.match(BITBUCKET_PATTERN);
  if (bitbucketMatch) {
    return { owner: bitbucketMatch[1], name: bitbucketMatch[2], provider: 'bitbucket' };
  }

  throw new Error('Invalid repository URL');
}

function getEnvVarName(repoName: string, provider: GitProviderType): string | null {
  if (provider === 'github') return null;
  if (provider === 'bitbucket') {
    return `BITBUCKET_TOKEN_${repoName.toUpperCase()}`;
  }
  return null;
}
```

**URL Parsing Edge Cases:**
- Handles URLs with or without `@` prefix (authentication is stripped by regex)
- Handles URLs with or without trailing `.git`
- Handles both SSH (`:`) and HTTPS (`/`) URL formats

## Bitbucket API Implementation

### Base Configuration

- **Base URL:** `https://api.bitbucket.org/2.0`
- **Auth Header:** `Authorization: Bearer {repository_access_token}`
- **Rate Limit:** 1000 requests/hour per workspace (handle with retry)

### URL Parsing

The `parseRepoUrl` function extracts workspace and repo slug:
```
Input:  https://efe_turhan@bitbucket.org/efe_turhan/orthero5.git
        https://bitbucket.org/efe_turhan/orthero5
        git@bitbucket.org:efe_turhan/orthero5.git

Output: owner = "efe_turhan"  (workspace)
        name = "orthero5"     (repo_slug)
        provider = "bitbucket"
        token_env_var = "BITBUCKET_TOKEN_ORTHERO5"
```

### Key Endpoints

| Operation | Endpoint |
|-----------|----------|
| Repo info | `/repositories/{workspace}/{repo_slug}` |
| Commits   | `/repositories/{workspace}/{repo_slug}/commits?pagelen=50` |
| Branches  | `/repositories/{workspace}/{repo_slug}/refs/branches` |
| Diffstat  | `/repositories/{workspace}/{repo_slug}/diffstat/{commit}` |

**Pagination:** Bitbucket uses `next` URL in response for pagination. Use `pagelen=50` to balance between API calls and response size.

## Async Lines Data Flow

Bitbucket doesn't provide additions/deletions in the commits endpoint. Solution:

1. **Initial Sync:** Fetch commits with `additions: 0, deletions: 0`
2. **Store commits:** Write to database immediately
3. **Background Processing:** After HTTP response is sent, fetch diffstat for each commit
4. **Update:** `UPDATE commits SET lines_added=X, lines_removed=Y WHERE sha=...`

### Implementation Details

```typescript
// Background job runs after sync completes
async function fetchDiffstatInBackground(repoId: number, url: string, token: string) {
  const bitbucket = new BitbucketAPI(token);

  // Find commits needing diffstat (idempotent - can be re-run safely)
  const pendingCommits = await db.query(`
    SELECT sha FROM commits
    WHERE repo_id = ? AND additions = 0 AND deletions = 0
    ORDER BY date DESC
  `, [repoId]);

  for (const commit of pendingCommits) {
    try {
      const diffstat = await bitbucket.getCommitDiffstat(url, commit.sha);
      await db.query(`
        UPDATE commits
        SET lines_added = ?, lines_removed = ?
        WHERE repo_id = ? AND sha = ?
      `, [diffstat.additions, diffstat.deletions, repoId, commit.sha]);

      // Small delay to respect rate limits (1000/hour = ~1 per 3.6 seconds)
      await sleep(4000);
    } catch (error) {
      // Log error but continue with next commit
      console.error(`Failed to fetch diffstat for ${commit.sha}:`, error);
      await db.query(`
        UPDATE repos
        SET sync_error = ?
        WHERE id = ?
      `, [`Failed to fetch diffstat for ${commit.sha.substring(0, 8)}`, repoId]);
    }
  }

  // Clear error when complete
  await db.query(`UPDATE repos SET sync_error = NULL WHERE id = ?`, [repoId]);
}

// In sync route - fire and forget
await fetchDiffstatInBackground(repo.id, url, token);
```

### Error Handling & Retry

- **Rate limiting:** 4-second delay between diffstat requests (well under 1000/hour limit)
- **Failures:** Continue processing remaining commits, log error to `repos.sync_error`
- **Idempotent:** Can be safely re-run (only processes commits where additions/deletions = 0)
- **No retry loop:** Failed commits remain at 0/0; can be retried by manually triggering sync again

### Serverless Considerations

In Vercel serverless functions, `setImmediate` is unreliable. The background job runs as:
1. Fire-and-forget async function that doesn't await
2. HTTP response returns immediately after storing commits
3. Background job continues until function timeout (max 60 seconds for Hobby plan)

**Future improvement:** Use Vercel Cron Jobs for large repositories.

## UI Changes

### Add Repository Dialog (`add-repo-dialog.tsx`)

**Changes:**
1. Add `tokenEnvVar` state field (read-only, auto-generated from URL)
2. Update URL validation to accept both patterns:
   - GitHub: `github.com[:/]owner/repo[.git]`
   - Bitbucket: `bitbucket.org[:/]workspace/repo[.git]`
3. When Bitbucket URL detected:
   - Extract repo name from URL
   - Auto-generate token env var: `BITBUCKET_TOKEN_{REPONAME}`
   - Show info alert: `"Configure {envVar} in Vercel environment variables"`
4. Send `provider` and `token_env_var` to POST `/api/repos`

**New UI elements:**
```tsx
// Read-only input showing auto-generated token name
<Label>Token Environment Variable</Label>
<Input value={tokenEnvVar} disabled />
{provider === 'bitbucket' && (
  <Alert variant="info">
    Configure <Code>{tokenEnvVar}</Code> in Vercel before syncing
  </Alert>
)}
```

### Dashboard / Repo List (`repo-list.tsx`)

**Changes:**
1. Add provider badge next to repo name
2. Use lucide-react icons:
   - GitHub: `<GitBranch className="h-4 w-4" />`
   - Bitbucket: `<Container className="h-4 w-4" />` (or custom Bitbucket icon)
3. If `sync_error` is not null: show warning icon with tooltip containing error message

## Error Handling

| Scenario         | Behavior |
|------------------|----------|
| Unsupported URL  | Throw error, show "Unsupported git provider" |
| Missing env var  | Store error in `repos.sync_error`, show warning in UI, don't fail sync |
| Invalid token    | Fail sync immediately, show "Authentication failed", store in `sync_error` |
| Rate limit (GitHub) | Retry with exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries) |
| Rate limit (Bitbucket) | Built-in 4s delay prevents hitting limit; if hit, fail gracefully |

**Rate Limit Configuration:**
```typescript
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // ms
const MAX_RETRIES = 5;

async function fetchWithRetry(url: string, token: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

## Files to Create/Modify

| File | Action | Details |
|------|--------|---------|
| `src/lib/db.ts` | Modify | Add `provider`, `token_env_var`, `sync_error` columns to Repo interface; update `createRepo` signature |
| `src/lib/github.ts` | Delete | Remove after refactoring |
| `src/lib/git/github-provider.ts` | Create | Move/refactor `GitHubAPI` class to implement `GitProvider` interface |
| `src/lib/git/provider.ts` | Create | Define `GitProvider`, `GitCommit`, `GitBranch`, `GitRepoInfo` interfaces |
| `src/lib/git/bitbucket-provider.ts` | Create | Implement `BitbucketAPI` class with required methods |
| `src/lib/git/index.ts` | Create | Export `createProvider()` factory function |
| `src/app/api/sync/route.ts` | Modify | Use provider factory, call `fetchDiffstatInBackground` for Bitbucket |
| `src/app/api/repos/route.ts` | Modify | Accept `provider` and `token_env_var` in POST body; pass to `createRepo` |
| `src/components/dashboard/add-repo-dialog.tsx` | Modify | Add token env var display, Bitbucket info alert, update validation |
| `src/components/dashboard/repo-list.tsx` | Modify | Add provider badge icon, show `sync_error` if present |
| `src/types/index.ts` | Modify | Add `GitProviderType` type |

**Note:** Webhook routes (`src/app/api/webhooks/github/route.ts`) are unchanged as they only handle GitHub webhooks.

## Testing Strategy

1. Unit tests for provider detection
2. Unit tests for Bitbucket URL parsing
3. Integration tests for Bitbucket API calls (using mock server)
4. Manual testing with real Bitbucket repository
5. Verify existing GitHub functionality remains intact

## Migration Path

### Phase 1: Database Migration (safe, can be done first)
```sql
-- Add new columns with defaults
ALTER TABLE repos ADD COLUMN provider TEXT DEFAULT 'github';
ALTER TABLE repos ADD COLUMN token_env_var TEXT;
ALTER TABLE repos ADD COLUMN sync_error TEXT;

-- Update existing repos
UPDATE repos SET provider = 'github' WHERE provider IS NULL;
```

### Phase 2: Code Deployment (atomic deploy)
1. Deploy new provider interface code (all new files in `src/lib/git/`)
2. Update imports in API routes to use new provider factory
3. Deploy changes to API routes and UI components

### Phase 3: Testing
1. Verify existing GitHub repos still sync correctly
2. Add Bitbucket repository with token configured
3. Verify Bitbucket sync completes successfully
4. Verify diffstat background job populates lines data

### Rollback Plan
If deployment fails:
- Revert code changes (database columns are backward compatible with defaults)
- GitHub repos continue working with `provider='github'` default
- No data loss (new columns are nullable/have defaults)
