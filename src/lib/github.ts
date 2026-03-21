// src/lib/github.ts
// Backward compatibility exports - re-export from new location
export { GitHubAPI, parseGitHubRepoFromUrl } from './git/github-provider';

// Re-export shared types for convenience
export type { GitCommit as GitHubCommit, GitBranch as GitHubBranch, GitRepoInfo as GitHubRepoInfo } from './git/provider';
