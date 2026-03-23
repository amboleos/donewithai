// tests/lib/code-analyzer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeAnalyzer } from '@/lib/code-analyzer';
import type { GitProvider, CommitDiff, BranchDiff } from '@/lib/git/provider';

// Mock smart-filter functions
const mockFilterDiffFiles = vi.fn();
const mockFormatDiffForLLM = vi.fn(() => 'mocked formatted diff');

vi.mock('@/lib/smart-filter', () => ({
  filterDiffFiles: () => mockFilterDiffFiles(),
  formatDiffForLLM: () => mockFormatDiffForLLM(),
}));

// Declare mock function at module level (outside describe block)
let mockChatCompletionsCreate: any;

// Mock OpenAI module using a factory that doesn't reference module-level variables
vi.mock('openai', () => {
  const create = vi.fn();
  // Store the function globally so we can access it later
  (globalThis as any).__mockChatCompletionsCreate = create;
  return {
    default: class {
      chat = {
        completions: {
          create,
        },
      };
      constructor(config: any) {}
    },
  };
});

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;
  let mockProvider: GitProvider;

  beforeEach(() => {
    // Get the mock function from global scope
    mockChatCompletionsCreate = (globalThis as any).__mockChatCompletionsCreate;

    // Reset all mocks
    vi.clearAllMocks();
    mockFilterDiffFiles.mockReset();
    mockFormatDiffForLLM.mockReset();

    if (mockChatCompletionsCreate) {
      mockChatCompletionsCreate.mockReset();
    }

    // Create mock provider with all required methods
    mockProvider = {
      getRepoInfo: vi.fn(),
      getCommits: vi.fn(),
      getBranches: vi.fn(),
      getCommitDiff: vi.fn(),
      getBranchDiff: vi.fn(),
      getBranchCommitCount: vi.fn(),
      getCommitDiffstat: vi.fn(),
      setupWebhook: vi.fn(),
    };

    // Initialize analyzer with API key
    analyzer = new CodeAnalyzer('test-api-key', 'glm-4.5-air');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canAnalyze()', () => {
    it('should return true when API key is configured', () => {
      const analyzerWithKey = new CodeAnalyzer('test-api-key');
      expect(analyzerWithKey.canAnalyze()).toBe(true);
    });

    it('should return false when no API key is provided', () => {
      const analyzerWithoutKey = new CodeAnalyzer();
      expect(analyzerWithoutKey.canAnalyze()).toBe(false);
    });
  });

  describe('analyzeCommit()', () => {
    const mockCommitDiff: CommitDiff = {
      sha: 'abc123',
      files: [
        {
          path: 'src/test.ts',
          additions: 50,
          deletions: 10,
          content: '+ export function test() {\n+   return true;\n+ }',
        },
      ],
      totalAdditions: 50,
      totalDeletions: 10,
    };

    it('should return isAgentic: true when AI-generated code is detected', async () => {
      // Mock filterDiffFiles to return filtered data
      mockFilterDiffFiles.mockReturnValue({
        filtered: [
          {
            path: 'src/test.ts',
            additions: 50,
            deletions: 10,
            content: '+ export function test() {\n+   return true;\n+ }',
            isExcluded: false,
            language: 'typescript',
          },
        ],
        stats: {
          totalFiles: 1,
          includedFiles: 1,
          excludedFiles: 0,
          totalLinesAdded: 50,
          totalLinesRemoved: 10,
        },
      });

      // Mock provider to return diff
      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      // Mock OpenAI API response for AI-generated code
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                confidence: 0.9,
                patternsFound: ['multi-file changes', 'test suite'],
                reasoning: 'This appears to be AI-generated code with multi-file coordination',
                fileBreakdown: [
                  {
                    path: 'src/test.ts',
                    analysis: 'New test file added',
                  },
                ],
              }),
            },
          },
        ],
        usage: {
          total_tokens: 500,
        },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider);

      expect(result.isAgentic).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(result.tokensUsed).toBe(500);
      expect(mockProvider.getCommitDiff).toHaveBeenCalledWith('https://github.com/test/repo', 'abc123');
    });

    it('should return isAgentic: false when human-written code is detected', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [
          {
            path: 'src/fix.ts',
            additions: 5,
            deletions: 2,
            content: '- return false\n+ return true',
            isExcluded: false,
            language: 'typescript',
          },
        ],
        stats: {
          totalFiles: 1,
          includedFiles: 1,
          excludedFiles: 0,
          totalLinesAdded: 5,
          totalLinesRemoved: 2,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      // Mock OpenAI API response for human-written code
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: false,
                confidence: 0.85,
                patternsFound: ['small fix'],
                reasoning: 'Small inline change typical of human developer',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: {
          total_tokens: 300,
        },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider);

      expect(result.isAgentic).toBe(false);
      expect(result.confidence).toBe(0.85);
    });

    it('should return correct confidence score between 0 and 1', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      // Test with confidence at boundaries - each test case independently
      const testCases = [
        { confidence: 0.1, expected: 0.1, desc: 'Small positive value' },
        { confidence: 0.5, expected: 0.5, desc: 'Medium value' },
        { confidence: 1.0, expected: 1.0, desc: 'Maximum value' },
        { confidence: 1.5, expected: 1.0, desc: 'Clamped to 1.0' },
      ];

      for (const testCase of testCases) {
        // Reset mock before each test case
        mockChatCompletionsCreate.mockReset();
        mockChatCompletionsCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isAgentic: testCase.confidence > 0.5,
                  confidence: testCase.confidence,
                  patternsFound: [],
                  reasoning: 'Test',
                  fileBreakdown: [],
                }),
              },
            },
          ],
          usage: { total_tokens: 100 },
        });

        const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider);
        expect(result.confidence).toBe(testCase.expected);
      }
    });

    it('should handle API errors gracefully with heuristic fallback', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [
          {
            path: 'src/large-change.ts',
            additions: 600,
            deletions: 100,
            content: 'large content',
            isExcluded: false,
            language: 'typescript',
          },
        ],
        stats: {
          totalFiles: 1,
          includedFiles: 1,
          excludedFiles: 0,
          totalLinesAdded: 600,
          totalLinesRemoved: 100,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      // Mock API error
      mockChatCompletionsCreate.mockRejectedValue(new Error('API timeout'));

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider);

      // Should fallback to heuristic analysis
      expect(result.isAgentic).toBe(true); // 600 lines >= 500 threshold
      expect(result.confidence).toBe(0.4); // Default heuristic confidence
      expect(result.report.summary).toContain('heuristics');
    });

    it('should return proper report structure', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [
          {
            path: 'src/test.ts',
            additions: 50,
            deletions: 10,
            content: 'test content',
            isExcluded: false,
            language: 'typescript',
          },
          {
            path: 'package.json',
            additions: 5,
            deletions: 0,
            content: '{}',
            isExcluded: true,
            excludeReason: 'config file',
            language: 'json',
          },
        ],
        stats: {
          totalFiles: 2,
          includedFiles: 1,
          excludedFiles: 1,
          totalLinesAdded: 50,
          totalLinesRemoved: 10,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                confidence: 0.8,
                patternsFound: ['multi-file changes'],
                reasoning: 'Test reasoning',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 400 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider);

      expect(result.report).toMatchObject({
        summary: expect.any(String),
        filesAnalyzed: 1,
        linesAdded: 50,
        linesRemoved: 10,
        patternsFound: ['multi-file changes'],
        reasoning: 'Test reasoning',
        fileBreakdown: expect.any(Array),
      });

      // Check fileBreakdown structure
      expect(result.report.fileBreakdown.length).toBeGreaterThan(0);
      expect(result.report.fileBreakdown[0]).toMatchObject({
        path: expect.any(String),
        language: expect.any(String),
        additions: expect.any(Number),
        deletions: expect.any(Number),
        patterns: expect.any(Array),
        isExcluded: expect.any(Boolean),
      });
    });

    it('should call onProgress callback with correct stages', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(mockCommitDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{"isAgentic": false, "confidence": 0.5, "patternsFound": [], "reasoning": "test", "fileBreakdown": []}' } }],
        usage: { total_tokens: 100 },
      });

      const progressCallback = vi.fn();
      await analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('fetching', expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith('filtering', expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith('formatting', expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith('analyzing', expect.any(String));
    });

    it('should throw error when API key is not configured', async () => {
      const analyzerWithoutKey = new CodeAnalyzer();
      await expect(
        analyzerWithoutKey.analyzeCommit('https://github.com/test/repo', 'abc123', mockProvider)
      ).rejects.toThrow('z.ai API key not configured');
    });

    it('should throw error when provider does not support diff fetching', async () => {
      const incompleteProvider = {
        getRepoInfo: vi.fn(),
        getCommits: vi.fn(),
        getBranches: vi.fn(),
      } as any;

      await expect(
        analyzer.analyzeCommit('https://github.com/test/repo', 'abc123', incompleteProvider)
      ).rejects.toThrow('Git provider does not support diff fetching');
    });
  });

  describe('analyzeBranch()', () => {
    const mockBranchDiff: BranchDiff = {
      branchName: 'feature/test',
      baseBranch: 'main',
      files: [
        {
          path: 'src/feature.ts',
          additions: 100,
          deletions: 20,
          content: '+ new feature code',
        },
      ],
      totalAdditions: 100,
      totalDeletions: 20,
    };

    it('should analyze branch tip commit', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [
          {
            path: 'src/feature.ts',
            additions: 100,
            deletions: 20,
            content: 'feature code',
            isExcluded: false,
            language: 'typescript',
          },
        ],
        stats: {
          totalFiles: 1,
          includedFiles: 1,
          excludedFiles: 0,
          totalLinesAdded: 100,
          totalLinesRemoved: 20,
        },
      });

      (mockProvider.getBranchDiff as any).mockResolvedValue(mockBranchDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                confidence: 0.75,
                patternsFound: ['new module'],
                reasoning: 'Branch contains new feature module',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 600 },
      });

      const result = await analyzer.analyzeBranch(
        'https://github.com/test/repo',
        'feature/test',
        mockProvider,
        'main'
      );

      expect(result.isAgentic).toBe(true);
      expect(result.confidence).toBe(0.75);
      expect(mockProvider.getBranchDiff).toHaveBeenCalledWith('https://github.com/test/repo', 'feature/test', 'main');
    });

    it('should handle branches with no commits', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getBranchDiff as any).mockResolvedValue({
        branchName: 'empty-branch',
        baseBranch: 'main',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: false,
                confidence: 0.5,
                patternsFound: [],
                reasoning: 'No changes detected',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      const result = await analyzer.analyzeBranch(
        'https://github.com/test/repo',
        'empty-branch',
        mockProvider
      );

      expect(result.isAgentic).toBe(false);
      expect(result.report.filesAnalyzed).toBe(0);
    });

    it('should return agentic status correctly for multi-file branches', async () => {
      // Create a multi-file branch diff
      const multiFileDiff: BranchDiff = {
        branchName: 'feature/large',
        baseBranch: 'main',
        files: [
          { path: 'src/module1.ts', additions: 200, deletions: 0, content: 'module 1' },
          { path: 'src/module2.ts', additions: 200, deletions: 0, content: 'module 2' },
          { path: 'src/module3.ts', additions: 200, deletions: 0, content: 'module 3' },
          { path: 'tests/module1.test.ts', additions: 150, deletions: 0, content: 'test 1' },
        ],
        totalAdditions: 750,
        totalDeletions: 0,
      };

      mockFilterDiffFiles.mockReturnValue({
        filtered: multiFileDiff.files.map(f => ({
          ...f,
          isExcluded: false,
          language: 'typescript',
        })),
        stats: {
          totalFiles: 4,
          includedFiles: 4,
          excludedFiles: 0,
          totalLinesAdded: 750,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getBranchDiff as any).mockResolvedValue(multiFileDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                confidence: 0.95,
                patternsFound: ['multi-file coordination', 'test coverage', 'new modules'],
                reasoning: 'Complex multi-file feature with tests suggests agentic AI',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 1000 },
      });

      const result = await analyzer.analyzeBranch(
        'https://github.com/test/repo',
        'feature/large',
        mockProvider
      );

      expect(result.isAgentic).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.report.patternsFound).toContain('multi-file coordination');
    });

    it('should call onProgress callback for branch analysis', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getBranchDiff as any).mockResolvedValue(mockBranchDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: '{"isAgentic": false, "confidence": 0.5, "patternsFound": [], "reasoning": "test", "fileBreakdown": []}' } }],
        usage: { total_tokens: 100 },
      });

      const progressCallback = vi.fn();
      await analyzer.analyzeBranch('https://github.com/test/repo', 'test', mockProvider, undefined, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('fetching', expect.stringContaining('test'));
      expect(progressCallback).toHaveBeenCalledWith('filtering', expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith('formatting', expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith('analyzing', expect.any(String));
    });

    it('should throw error when API key is not configured', async () => {
      const analyzerWithoutKey = new CodeAnalyzer();
      await expect(
        analyzerWithoutKey.analyzeBranch('https://github.com/test/repo', 'test', mockProvider)
      ).rejects.toThrow('z.ai API key not configured');
    });

    it('should throw error when provider does not support branch diff', async () => {
      const incompleteProvider = {
        getRepoInfo: vi.fn(),
        getCommits: vi.fn(),
        getBranches: vi.fn(),
      } as any;

      await expect(
        analyzer.analyzeBranch('https://github.com/test/repo', 'test', incompleteProvider)
      ).rejects.toThrow('Git provider does not support branch diff fetching');
    });
  });

  describe('edge cases', () => {
    it('should handle empty diff', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      const emptyDiff: CommitDiff = {
        sha: 'empty',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      };

      (mockProvider.getCommitDiff as any).mockResolvedValue(emptyDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: false,
                confidence: 0.5,
                patternsFound: [],
                reasoning: 'No code to analyze',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 50 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'empty', mockProvider);

      expect(result.isAgentic).toBe(false);
      expect(result.report.filesAnalyzed).toBe(0);
    });

    it('should handle very large diff', async () => {
      const largeDiff: CommitDiff = {
        sha: 'large',
        files: Array.from({ length: 100 }, (_, i) => ({
          path: `src/file${i}.ts`,
          additions: 100,
          deletions: 0,
          content: 'x'.repeat(10000), // Very large file
        })),
        totalAdditions: 10000,
        totalDeletions: 0,
      };

      mockFilterDiffFiles.mockReturnValue({
        filtered: largeDiff.files.map(f => ({
          ...f,
          isExcluded: false,
          language: 'typescript',
        })),
        stats: {
          totalFiles: 100,
          includedFiles: 100,
          excludedFiles: 0,
          totalLinesAdded: 10000,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue(largeDiff);

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                confidence: 0.9,
                patternsFound: ['large-scale changes'],
                reasoning: 'Massive change suggests agentic AI',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 2000 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'large', mockProvider);

      expect(result.isAgentic).toBe(true);
      expect(result.report.filesAnalyzed).toBe(100);
      expect(result.tokensUsed).toBe(2000);
    });

    it('should handle API timeout gracefully', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'timeout-test',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      // Mock timeout error
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockChatCompletionsCreate.mockRejectedValue(timeoutError);

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'timeout-test', mockProvider);

      // Should fallback to heuristic
      expect(result.confidence).toBe(0.4);
      expect(result.report.summary).toContain('heuristics');
    });

    it('should handle invalid JSON response format', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'invalid-json',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      // Mock invalid JSON response
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON {{{',
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'invalid-json', mockProvider);

      // Should fallback to heuristic
      expect(result.report.summary).toContain('heuristics');
      expect(result.confidence).toBe(0.4);
    });

    it('should handle response with markdown code blocks', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'markdown-test',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      // Mock response wrapped in markdown
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"isAgentic": true, "confidence": 0.8, "patternsFound": ["test"], "reasoning": "test", "fileBreakdown": []}\n```',
            },
          },
        ],
        usage: { total_tokens: 150 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'markdown-test', mockProvider);

      // Should successfully parse
      expect(result.isAgentic).toBe(true);
      expect(result.confidence).toBe(0.8);
    });

    it('should handle missing confidence field', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'no-confidence',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      // Mock response without confidence field
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isAgentic: true,
                patternsFound: [],
                reasoning: 'test',
                fileBreakdown: [],
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'no-confidence', mockProvider);

      // Should default to 0.5
      expect(result.confidence).toBe(0.5);
    });

    it('should handle network errors', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'network-error',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      // Mock network error
      const networkError = new Error('Network error');
      (networkError as any).code = 'ENOTFOUND';
      mockChatCompletionsCreate.mockRejectedValue(networkError);

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'network-error', mockProvider);

      // Should fallback to heuristic
      expect(result.report.summary).toContain('heuristics');
      expect(result.confidence).toBe(0.4);
    });
  });

  describe('durationMs tracking', () => {
    it('should track duration for commit analysis', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getCommitDiff as any).mockResolvedValue({
        sha: 'duration-test',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      mockChatCompletionsCreate.mockImplementation(async () => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          choices: [{ message: { content: '{"isAgentic": false, "confidence": 0.5, "patternsFound": [], "reasoning": "test", "fileBreakdown": []}' } }],
          usage: { total_tokens: 100 },
        };
      });

      const result = await analyzer.analyzeCommit('https://github.com/test/repo', 'duration-test', mockProvider);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThan(1000); // Should be fast
    });

    it('should track duration for branch analysis', async () => {
      mockFilterDiffFiles.mockReturnValue({
        filtered: [],
        stats: {
          totalFiles: 0,
          includedFiles: 0,
          excludedFiles: 0,
          totalLinesAdded: 0,
          totalLinesRemoved: 0,
        },
      });

      (mockProvider.getBranchDiff as any).mockResolvedValue({
        branchName: 'test',
        baseBranch: 'main',
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
      });

      mockChatCompletionsCreate.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          choices: [{ message: { content: '{"isAgentic": false, "confidence": 0.5, "patternsFound": [], "reasoning": "test", "fileBreakdown": []}' } }],
          usage: { total_tokens: 100 },
        };
      });

      const result = await analyzer.analyzeBranch('https://github.com/test/repo', 'test', mockProvider);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
