export class MockGitProvider {
  async getRepoInfo(url: string) {
    return { name: 'test', owner: 'test' };
  }
  async getCommits(url: string) {
    return [];
  }
}
