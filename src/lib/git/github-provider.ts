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
    const branches: GitBranch[] = [];
    let page = 1;
    const perPage = 100;
    const MAX_PAGES = 100; // Safety limit: max 100 pages = 10,000 branches

    while (page <= MAX_PAGES) {
      console.log(`[GitHubAPI] Fetching branches page ${page}`);

      const { data } = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: perPage,
        page,
      });

      console.log(`[GitHubAPI] Page ${page} has ${data.length} branches`);

      if (data.length === 0) break;

      for (const branch of data) {
        branches.push({
          name: branch.name,
          commit: { sha: branch.commit.sha },
        });
      }

      // If we got less than per_page, we're done
      if (data.length < perPage) break;

      page++;
    }

    if (page > MAX_PAGES) {
      console.warn('[GitHubAPI] Reached maximum pages limit for branches, truncating results');
    }

    return branches;
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

// Export utility function for backward compatibility
export function parseGitHubRepoFromUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
}
