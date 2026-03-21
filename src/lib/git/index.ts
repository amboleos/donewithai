// src/lib/git/index.ts
import { GitHubAPI } from './github-provider';
import { BitbucketAPI } from './bitbucket-provider';
import type { GitProvider } from './provider';
import type { GitProviderType, ParsedRepoUrl } from '@/types';

// URL patterns for provider detection
const GITHUB_PATTERN = /github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/;
const BITBUCKET_PATTERN = /bitbucket\.org[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?(?:\?.*)?$/;

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

    if (!envVarName) {
      throw new Error('Could not determine Bitbucket token environment variable name');
    }

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
