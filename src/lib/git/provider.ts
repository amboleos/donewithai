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
