// src/types/index.ts
export type GitProviderType = 'github' | 'bitbucket';

export interface ParsedRepoUrl {
  owner: string;
  name: string;
  provider: GitProviderType;
}
