// src/lib/git/bitbucket-provider.ts
import type { GitProvider, GitCommit, GitBranch, GitRepoInfo, CommitDiff, CommitDiffFile, BranchDiff } from './provider';

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
      throw new Error(`Bitbucket API error: ${response.status} ${response.statusText} (URL: ${url})`);
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
    // Allows trailing slashes and optional query parameters
    const match = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?(?:\?.*)?$/);
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

  async getCommits(url: string, since?: Date, _perPage?: number): Promise<GitCommit[]> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    let apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/commits?pagelen=50`;

    if (since) {
      apiUrl += `&since=${since.toISOString()}`;
    }

    console.log('[BitbucketAPI] Fetching commits from:', apiUrl);
    const commits: GitCommit[] = [];
    let pageCount = 0;
    const MAX_PAGES = 100; // Safety limit: max 100 pages = 5000 commits

    while (apiUrl && pageCount < MAX_PAGES) {
      pageCount++;
      console.log('[BitbucketAPI] Fetching page', pageCount);
      const response = await fetchWithRetry(apiUrl, this.token);
      const data: BitbucketPaginatedResponse<BitbucketCommit> = await response.json();
      console.log('[BitbucketAPI] Page', pageCount, 'has', data.values.length, 'commits');

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

      // Get next page - stop if no commits on this page
      apiUrl = (data.values.length > 0 && data.next) ? data.next : '';
    }

    if (pageCount >= MAX_PAGES) {
      console.warn('[BitbucketAPI] Reached maximum pages limit, truncating results');
    }

    return commits;
  }

  async getBranches(url: string): Promise<GitBranch[]> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    let apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`;

    const branches: GitBranch[] = [];
    let pageCount = 0;
    const MAX_PAGES = 100; // Safety limit: max 100 pages = 10,000 branches

    console.log(`[BitbucketAPI] Starting branch fetch for ${workspace}/${repoSlug}`);

    while (apiUrl && pageCount < MAX_PAGES) {
      pageCount++;
      console.log('[BitbucketAPI] Fetching branches page', pageCount, 'URL:', apiUrl.substring(0, 100) + '...');

      const response = await fetchWithRetry(apiUrl, this.token);
      const data: BitbucketPaginatedResponse<BitbucketBranch> = await response.json();

      console.log('[BitbucketAPI] Page', pageCount, 'has', data.values.length, 'branches', data.next ? '(has next)' : '(last page)');

      for (const branch of data.values) {
        branches.push({
          name: branch.name,
          commit: { sha: branch.target.hash },
        });
      }

      // Get next page - stop if no branches on this page OR no next URL
      if (data.values.length === 0 || !data.next) {
        console.log('[BitbucketAPI] Pagination complete. Total branches:', branches.length);
        break;
      }

      apiUrl = data.next;
    }

    if (pageCount >= MAX_PAGES) {
      console.warn('[BitbucketAPI] Reached maximum pages limit for branches, truncating results');
    }

    return branches;
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

  async getCommitDiff(url: string, sha: string): Promise<CommitDiff> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);
    const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/diff/${sha}`;

    const response = await fetchWithRetry(apiUrl, this.token);
    const diffText = await response.text();

    // Parse unified diff format
    const files: CommitDiffFile[] = [];
    const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const block of fileBlocks) {
      const lines = block.split('\n');
      const headerLine = lines[0] || '';

      // Extract filename from "a/path/to/file b/path/to/file"
      const match = headerLine.match(/^a\/(.+?)\s+b\/(.+?)(?:\s|$)/);
      const path = match ? match[2] : headerLine.split(' ')[0] || 'unknown';

      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      totalAdditions += additions;
      totalDeletions += deletions;

      files.push({
        path,
        additions,
        deletions,
        content: block,
      });
    }

    return {
      sha,
      files,
      totalAdditions,
      totalDeletions,
    };
  }

  async getBranchDiff(url: string, branchName: string, baseBranch?: string): Promise<BranchDiff> {
    const { workspace, repoSlug } = this.parseRepoUrl(url);

    // Get repo info to find default branch if base not specified
    let base = baseBranch;
    if (!base) {
      const repoInfo = await this.getRepoInfo(url);
      base = repoInfo.defaultBranch;
    }

    // Bitbucket compare API: /diff/{spec} where spec is branch1..branch2
    const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/diff/${base}..${branchName}`;

    const response = await fetchWithRetry(apiUrl, this.token);
    const diffText = await response.text();

    // Parse unified diff format (same as commit diff)
    const files: CommitDiffFile[] = [];
    const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const block of fileBlocks) {
      const lines = block.split('\n');
      const headerLine = lines[0] || '';

      // Extract filename from "a/path/to/file b/path/to/file"
      const match = headerLine.match(/^a\/(.+?)\s+b\/(.+?)(?:\s|$)/);
      const path = match ? match[2] : headerLine.split(' ')[0] || 'unknown';

      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      totalAdditions += additions;
      totalDeletions += deletions;

      files.push({
        path,
        additions,
        deletions,
        content: block,
      });
    }

    return {
      branchName,
      baseBranch: base,
      files,
      totalAdditions,
      totalDeletions,
    };
  }
}
