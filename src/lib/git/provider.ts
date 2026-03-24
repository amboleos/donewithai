// src/lib/git/provider.ts
export type { GitProviderType } from '@/types';

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

export interface CommitDiffFile {
  path: string;
  additions: number;
  deletions: number;
  content: string;  // The actual diff content
}

export interface CommitDiff {
  sha: string;
  files: CommitDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface BranchDiff {
  branchName: string;
  baseBranch: string;
  files: CommitDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
}

export interface GitProvider {
  getRepoInfo(url: string): Promise<GitRepoInfo>;
  getCommits(url: string, since?: Date): Promise<GitCommit[]>;
  getCommitsForBranch?(url: string, branchName: string, since?: Date): Promise<GitCommit[]>;
  getBranches(url: string): Promise<GitBranch[]>;
  getBranchCommitCount?(url: string, branchName: string): Promise<number>;
  getCommitDiffstat?(url: string, sha: string): Promise<{ additions: number; deletions: number }>;
  getCommitDiff?(url: string, sha: string): Promise<CommitDiff>;
  getBranchDiff?(url: string, branchName: string, baseBranch?: string): Promise<BranchDiff>;
  setupWebhook?(url: string, webhookUrl: string, secret?: string): Promise<void>;
}
