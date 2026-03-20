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
  hash: string;
  message: string;
  author: string;
  authorEmail: string | null;
  date: Date;
  additions: number;  // 0 initially for Bitbucket, filled async
  deletions: number;
}

interface GitBranch {
  name: string;
  commitHash: string;
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
  getCommitDiffstat?(url: string, hash: string): Promise<{additions: number, deletions: number}>;
}
```

### Database Schema Changes

```sql
ALTER TABLE repos ADD COLUMN provider TEXT DEFAULT 'github';
ALTER TABLE repos ADD COLUMN token_env_var TEXT;

-- Update existing repos
UPDATE repos SET provider = 'github' WHERE provider IS NULL;
```

| Column        | Type | Example                          |
|---------------|------|----------------------------------|
| provider      | TEXT | 'github' or 'bitbucket'          |
| token_env_var | TEXT | 'BITBUCKET_TOKEN_ORTHERO5' or NULL |

- GitHub repos: `token_env_var` is NULL (uses global `GITHUB_TOKEN`)
- Bitbucket repos: `token_env_var` stores the env var name

## Provider Detection

```typescript
function detectProvider(url: string): GitProviderType {
  if (url.includes('github.com')) return 'github';
  if (url.includes('bitbucket.org')) return 'bitbucket';
  throw new Error('Unsupported git provider');
}

function getEnvVarName(repoName: string, provider: GitProviderType): string | null {
  if (provider === 'github') return null;
  if (provider === 'bitbucket') {
    return `BITBUCKET_TOKEN_${repoName.toUpperCase()}`;
  }
  return null;
}
```

## Bitbucket API Implementation

### Base Configuration

- **Base URL:** `https://api.bitbucket.org/2.0`
- **Auth Header:** `Authorization: Bearer {repository_access_token}`

### URL Parsing

```
Input:  https://efe_turhan@bitbucket.org/efe_turhan/orthero5.git
Output: workspace = "efe_turhan"
        repo_slug = "orthero5"
        token_env_var = "BITBUCKET_TOKEN_ORTHERO5"
```

### Key Endpoints

| Operation | Endpoint |
|-----------|----------|
| Repo info | `/repositories/{workspace}/{repo_slug}` |
| Commits   | `/repositories/{workspace}/{repo_slug}/commits` |
| Branches  | `/repositories/{workspace}/{repo_slug}/refs/branches` |
| Diffstat  | `/repositories/{workspace}/{repo_slug}/diffstat/{commit}` |

## Async Lines Data Flow

Bitbucket doesn't provide additions/deletions in the commits endpoint. Solution:

1. **Initial Sync:** Fetch commits with `additions: 0, deletions: 0`
2. **Store commits:** Write to database immediately
3. **Background Job:** After sync completes, iterate through commits with 0/0 values
4. **Diffstat Fetch:** Call `/diffstat/{commit}` for each commit
5. **Update:** `UPDATE commits SET lines_added=X, lines_removed=Y WHERE hash=...`

```typescript
async function syncWithDiffstat(url: string) {
  // Fast path - store commits immediately
  const commits = await bitbucket.getCommits(url);
  await storeCommits(commits);

  // Async path - fill in diffstat data
  setImmediate(async () => {
    for (const commit of commits) {
      const diffstat = await bitbucket.getCommitDiffstat(url, commit.hash);
      await updateCommitLines(commit.hash, diffstat);
    }
  });
}
```

## UI Changes

### Add Repository Dialog

- URL validation accepts both `github.com` and `bitbucket.org` patterns
- When Bitbucket URL detected:
  - Extract repo name from URL
  - Show info message: `Make sure environment variable BITBUCKET_TOKEN_{REPONAME} is configured in Vercel`
  - Pre-fill `token_env_var` field with the auto-generated name

### Dashboard / Repo List

- Show provider badge next to repo name (GitHub/Bitbucket icon)
- If Bitbucket repo sync fails due to missing token: show warning icon with tooltip

## Error Handling

| Scenario         | Behavior |
|------------------|----------|
| Unsupported URL  | Throw error, show "Unsupported git provider" |
| Missing env var  | Store error in DB, show warning in UI, don't fail sync |
| Invalid token    | Fail sync, show "Authentication failed" |
| Rate limit       | Retry with exponential backoff |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/db.ts` | Modify: Add `provider`, `token_env_var` columns |
| `src/lib/github.ts` | Rename: `src/lib/git/github-provider.ts`, implement `GitProvider` |
| `src/lib/git/provider.ts` | Create: Base interface |
| `src/lib/git/bitbucket-provider.ts` | Create: Bitbucket API implementation |
| `src/lib/git/index.ts` | Create: Factory function |
| `src/app/api/sync/route.ts` | Modify: Use provider factory |
| `src/app/api/repos/route.ts` | Modify: Accept `provider` and `token_env_var` |
| `src/components/dashboard/add-repo-dialog.tsx` | Modify: Update validation, show Bitbucket info |
| `src/components/dashboard/repo-list.tsx` | Modify: Show provider badge |

## Testing Strategy

1. Unit tests for provider detection
2. Unit tests for Bitbucket URL parsing
3. Integration tests for Bitbucket API calls (using mock server)
4. Manual testing with real Bitbucket repository
5. Verify existing GitHub functionality remains intact

## Migration Path

1. Add database columns (with defaults)
2. Update existing repos to have `provider='github'`
3. Deploy new provider interface code
4. Test with Bitbucket repository
5. No data migration needed for commits table
