// tests/api/ai-analysis.integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from '@/app/api/ai/code-analysis/route';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';
import * as git from '@/lib/git';
import { CodeAnalyzer } from '@/lib/code-analyzer';
import { eventEmitter } from '@/app/api/events/route';

// Mock dependencies
vi.mock('@/lib/server-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getRepoById: vi.fn(),
  getCodeAnalysis: vi.fn(),
  getCodeAnalysisById: vi.fn(),
  saveCodeAnalysis: vi.fn(),
  getCommitById: vi.fn(),
  getBranchById: vi.fn(),
}));

vi.mock('@/lib/git', () => ({
  createProvider: vi.fn(),
  parseRepoUrl: vi.fn(),
  getEnvVarName: vi.fn(),
}));

vi.mock('@/app/api/events/route', () => ({
  eventEmitter: {
    emit: vi.fn(),
  },
}));

// Create mock methods outside the class so they can be spied on
const mockCanAnalyze = vi.fn().mockReturnValue(true);
const mockAnalyzeCommit = vi.fn().mockResolvedValue({
  isAgentic: true,
  confidence: 0.85,
  report: {
    summary: 'Agentic AI pattern detected',
    filesAnalyzed: 5,
    linesAdded: 200,
    linesRemoved: 50,
    patternsFound: ['multi-file coordination', 'test suite'],
    fileBreakdown: [],
    reasoning: 'Multiple coordinated changes across files',
  },
  tokensUsed: 1000,
  durationMs: 2000,
});
const mockAnalyzeBranch = vi.fn().mockResolvedValue({
  isAgentic: false,
  confidence: 0.6,
  report: {
    summary: 'Human-assisted changes',
    filesAnalyzed: 2,
    linesAdded: 30,
    linesRemoved: 10,
    patternsFound: [],
    fileBreakdown: [],
    reasoning: 'Small iterative changes',
  },
  tokensUsed: 500,
  durationMs: 1500,
});

vi.mock('@/lib/code-analyzer', () => {
  return {
    CodeAnalyzer: class {
      canAnalyze = mockCanAnalyze;
      analyzeCommit = mockAnalyzeCommit;
      analyzeBranch = mockAnalyzeBranch;
    },
  };
});

import { getServerSession } from '@/lib/server-auth';

describe('POST /api/ai/code-analysis', () => {
  let mockRequest: NextRequest;
  let mockProvider: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock behaviors
    mockCanAnalyze.mockReturnValue(true);
    mockAnalyzeCommit.mockResolvedValue({
      isAgentic: true,
      confidence: 0.85,
      report: {
        summary: 'Agentic AI pattern detected',
        filesAnalyzed: 5,
        linesAdded: 200,
        linesRemoved: 50,
        patternsFound: ['multi-file coordination', 'test suite'],
        fileBreakdown: [],
        reasoning: 'Multiple coordinated changes across files',
      },
      tokensUsed: 1000,
      durationMs: 2000,
    });
    mockAnalyzeBranch.mockResolvedValue({
      isAgentic: false,
      confidence: 0.6,
      report: {
        summary: 'Human-assisted changes',
        filesAnalyzed: 2,
        linesAdded: 30,
        linesRemoved: 10,
        patternsFound: [],
        fileBreakdown: [],
        reasoning: 'Small iterative changes',
      },
      tokensUsed: 500,
      durationMs: 1500,
    });

    // Setup default mock session (admin user)
    (getServerSession as any).mockResolvedValue({
      user: {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
    });

    // Setup mock provider
    mockProvider = {
      getCommitDiff: vi.fn(),
      getBranchDiff: vi.fn(),
    };

    (git.createProvider as any).mockReturnValue(mockProvider);

    // Setup environment variables
    process.env.ZAI_API_KEY = 'test-api-key';

    // Create mock request
    mockRequest = {
      json: vi.fn(),
      url: 'http://localhost:3000/api/ai/code-analysis',
      cookies: {
        get: vi.fn(),
      },
      headers: {
        get: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated users', async () => {
      (getServerSession as any).mockResolvedValue(null);

      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 for non-admin users', async () => {
      (getServerSession as any).mockResolvedValue({
        user: {
          id: 2,
          name: 'Developer User',
          email: 'dev@example.com',
          role: 'developer',
        },
      });

      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow admin users', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      (db.saveCodeAnalysis as any).mockResolvedValue({
        id: 1,
        is_agentic: 1,
        confidence: 0.85,
        tokens_used: 1000,
        duration_ms: 2000,
        model: 'z.ai-4.5-air',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).not.toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing repoId', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        sourceType: 'commit',
        sourceId: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for missing sourceType', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceId: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for missing sourceId', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid sourceType', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'invalid',
        sourceId: 1,
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid sourceType');
    });

    it('should return 404 for non-existent repo', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 999,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Repository not found');
    });
  });

  describe('Cached Analysis', () => {
    it('should return cached analysis if already analyzed', async () => {
      const mockCachedAnalysis = {
        id: 123,
        is_agentic: 1,
        confidence: 0.9,
        report: JSON.stringify({
          summary: 'Cached analysis',
          filesAnalyzed: 3,
          linesAdded: 100,
          linesRemoved: 20,
          patternsFound: [],
          fileBreakdown: [],
          reasoning: 'Cached',
        }),
        model: 'z.ai-4.5-air',
        duration_ms: 1500,
      };

      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(mockCachedAnalysis);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cached).toBe(true);
      expect(data.analysis.id).toBe(123);
      expect(data.analysis.isAgentic).toBe(true);
      expect(data.analysis.confidence).toBe(0.9);

      // Should not run analysis
      expect(mockAnalyzeCommit).not.toHaveBeenCalled();
      expect(db.saveCodeAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('Commit Analysis', () => {
    it('should analyze commit and save results', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      (db.saveCodeAnalysis as any).mockResolvedValue({
        id: 1,
        is_agentic: 1,
        confidence: 0.85,
        tokens_used: 1000,
        duration_ms: 2000,
        model: 'z.ai-4.5-air',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cached).toBe(false);
      expect(data.analysis.id).toBe(1);
      expect(data.analysis.isAgentic).toBe(true);
      expect(data.analysis.confidence).toBe(0.85);
      expect(data.analysis.tokensUsed).toBe(1000);
      expect(data.analysis.durationMs).toBe(2000);

      // Verify analysis was run
      expect(mockAnalyzeCommit).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        'abc123',
        mockProvider,
        expect.any(Function)
      );

      // Verify result was saved
      expect(db.saveCodeAnalysis).toHaveBeenCalledWith(
        1,
        'commit',
        1,
        true,
        0.85,
        expect.objectContaining({
          summary: 'Agentic AI pattern detected',
        }),
        'z.ai-4.5-air',
        1000,
        2000
      );
    });

    it('should return 404 for non-existent commit', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 999,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Commit not found');
    });

    it('should return 404 for commit from different repo', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 2, // Different repo
        sha: 'abc123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Commit not found');
    });
  });

  describe('Branch Analysis', () => {
    it('should analyze branch and save results', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'branch',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getBranchById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        name: 'feature-branch',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      (db.saveCodeAnalysis as any).mockResolvedValue({
        id: 2,
        is_agentic: 0,
        confidence: 0.6,
        tokens_used: 500,
        duration_ms: 1500,
        model: 'z.ai-4.5-air',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cached).toBe(false);
      expect(data.analysis.id).toBe(2);
      expect(data.analysis.isAgentic).toBe(false);
      expect(data.analysis.confidence).toBe(0.6);

      // Verify analysis was run
      expect(mockAnalyzeBranch).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        'feature-branch',
        mockProvider,
        undefined,
        expect.any(Function)
      );

      // Verify result was saved
      expect(db.saveCodeAnalysis).toHaveBeenCalledWith(
        1,
        'branch',
        1,
        false,
        0.6,
        expect.objectContaining({
          summary: 'Human-assisted changes',
        }),
        'z.ai-4.5-air',
        500,
        1500
      );
    });

    it('should return 404 for non-existent branch', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'branch',
        sourceId: 999,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getBranchById as any).mockResolvedValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Branch not found');
    });

    it('should return 404 for branch from different repo', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'branch',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getBranchById as any).mockResolvedValue({
        id: 1,
        repo_id: 2, // Different repo
        name: 'feature-branch',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Branch not found');
    });
  });

  describe('Progress Events', () => {
    it('should emit correct progress events during commit analysis', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      (db.saveCodeAnalysis as any).mockResolvedValue({
        id: 1,
        is_agentic: 1,
        confidence: 0.85,
        tokens_used: 1000,
        duration_ms: 2000,
        model: 'z.ai-4.5-air',
      });

      await POST(mockRequest);

      // Verify started event
      expect(eventEmitter.emit).toHaveBeenCalledWith({
        type: 'code_analysis_started',
        data: { repoId: 1, sourceType: 'commit', sourceId: 1 },
      });

      // Verify that analyzeCommit was called (which triggers progress events)
      expect(mockAnalyzeCommit).toHaveBeenCalled();

      // Verify completed event
      expect(eventEmitter.emit).toHaveBeenCalledWith({
        type: 'code_analysis_completed',
        data: {
          id: 1,
          repoId: 1,
          sourceType: 'commit',
          sourceId: 1,
          isAgentic: true,
          confidence: 0.85,
          summary: 'Agentic AI pattern detected',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when API key is not configured', async () => {
      mockCanAnalyze.mockReturnValue(false);

      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('z.ai API key not configured');

      mockCanAnalyze.mockReturnValue(true);
    });

    it('should return 400 when Bitbucket token is missing', async () => {
      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://bitbucket.org/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'bitbucket',
      });

      (git.getEnvVarName as any).mockReturnValue('BITBUCKET_TOKEN_REPO');

      // Don't set the environment variable
      delete process.env.BITBUCKET_TOKEN_REPO;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token not found: BITBUCKET_TOKEN_REPO');
    });

    it('should return 500 and emit error event on analysis failure', async () => {
      mockAnalyzeCommit.mockRejectedValue(new Error('Analysis failed'));

      mockRequest.json = vi.fn().mockResolvedValue({
        repoId: 1,
        sourceType: 'commit',
        sourceId: 1,
      });

      (db.getRepoById as any).mockResolvedValue({
        id: 1,
        name: 'test-repo',
        url: 'https://github.com/test/repo',
      });

      (db.getCodeAnalysis as any).mockResolvedValue(null);

      (db.getCommitById as any).mockResolvedValue({
        id: 1,
        repo_id: 1,
        sha: 'abc123',
      });

      (git.parseRepoUrl as any).mockReturnValue({
        owner: 'test',
        name: 'repo',
        provider: 'github',
      });

      (git.getEnvVarName as any).mockReturnValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');

      // Verify error event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith({
        type: 'code_analysis_error',
        data: { error: 'Analysis failed' },
      });

      // Reset mock
      mockAnalyzeCommit.mockResolvedValue({
        isAgentic: true,
        confidence: 0.85,
        report: {
          summary: 'Agentic AI pattern detected',
          filesAnalyzed: 5,
          linesAdded: 200,
          linesRemoved: 50,
          patternsFound: ['multi-file coordination', 'test suite'],
          fileBreakdown: [],
          reasoning: 'Multiple coordinated changes across files',
        },
        tokensUsed: 1000,
        durationMs: 2000,
      });
    });
  });
});

describe('GET /api/ai/code-analysis', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock session
    (getServerSession as any).mockResolvedValue({
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'developer',
      },
    });

    mockRequest = {
      url: 'http://localhost:3000/api/ai/code-analysis',
      cookies: {
        get: vi.fn(),
      },
      headers: {
        get: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated users', async () => {
      (getServerSession as any).mockResolvedValue(null);

      mockRequest.url = 'http://localhost:3000/api/ai/code-analysis?id=1';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Get Analysis by ID', () => {
    it('should return analysis by ID', async () => {
      const mockAnalysis = {
        id: 1,
        repo_id: 1,
        source_type: 'commit',
        source_id: 1,
        is_agentic: 1,
        confidence: 0.85,
        report: JSON.stringify({
          summary: 'Test analysis',
          filesAnalyzed: 5,
          linesAdded: 100,
          linesRemoved: 20,
          patternsFound: [],
          fileBreakdown: [],
          reasoning: 'Test reasoning',
        }),
        model: 'z.ai-4.5-air',
        tokens_used: 1000,
        duration_ms: 2000,
        created_at: '2026-03-23T00:00:00.000Z',
      };

      (db.getCodeAnalysisById as any).mockResolvedValue(mockAnalysis);

      mockRequest.url = 'http://localhost:3000/api/ai/code-analysis?id=1';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.id).toBe(1);
      expect(data.analysis.is_agentic).toBe(true);
      expect(data.analysis.report.summary).toBe('Test analysis');

      expect(db.getCodeAnalysisById).toHaveBeenCalledWith(1);
    });

    it('should return 404 for non-existent analysis ID', async () => {
      (db.getCodeAnalysisById as any).mockResolvedValue(null);

      mockRequest.url = 'http://localhost:3000/api/ai/code-analysis?id=999';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Analysis not found');
    });
  });

  describe('Get Analysis by Parameters', () => {
    it('should return analysis by repoId, sourceType, and sourceId', async () => {
      const mockAnalysis = {
        id: 2,
        repo_id: 1,
        source_type: 'branch',
        source_id: 1,
        is_agentic: 0,
        confidence: 0.6,
        report: JSON.stringify({
          summary: 'Branch analysis',
          filesAnalyzed: 2,
          linesAdded: 30,
          linesRemoved: 10,
          patternsFound: [],
          fileBreakdown: [],
          reasoning: 'Branch reasoning',
        }),
        model: 'z.ai-4.5-air',
        tokens_used: 500,
        duration_ms: 1500,
        created_at: '2026-03-23T00:00:00.000Z',
      };

      (db.getCodeAnalysis as any).mockResolvedValue(mockAnalysis);

      mockRequest.url =
        'http://localhost:3000/api/ai/code-analysis?repoId=1&sourceType=branch&sourceId=1';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analysis).toBeDefined();
      expect(data.analysis.id).toBe(2);
      expect(data.analysis.is_agentic).toBe(false);
      expect(data.analysis.report.summary).toBe('Branch analysis');

      expect(db.getCodeAnalysis).toHaveBeenCalledWith(1, 'branch', 1);
    });

    it('should return 404 for non-existent analysis with parameters', async () => {
      (db.getCodeAnalysis as any).mockResolvedValue(null);

      mockRequest.url =
        'http://localhost:3000/api/ai/code-analysis?repoId=999&sourceType=commit&sourceId=999';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Analysis not found');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing parameters', async () => {
      mockRequest.url = 'http://localhost:3000/api/ai/code-analysis';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing parameters');
    });

    it('should prioritize ID parameter over other parameters', async () => {
      const mockAnalysis = {
        id: 1,
        repo_id: 1,
        source_type: 'commit',
        source_id: 1,
        is_agentic: 1,
        confidence: 0.85,
        report: JSON.stringify({
          summary: 'Test',
          filesAnalyzed: 1,
          linesAdded: 1,
          linesRemoved: 0,
          patternsFound: [],
          fileBreakdown: [],
          reasoning: 'Test',
        }),
        model: 'z.ai-4.5-air',
        tokens_used: 100,
        duration_ms: 100,
        created_at: '2026-03-23T00:00:00.000Z',
      };

      (db.getCodeAnalysisById as any).mockResolvedValue(mockAnalysis);

      mockRequest.url =
        'http://localhost:3000/api/ai/code-analysis?id=1&repoId=2&sourceType=branch&sourceId=2';

      const response = await GET(mockRequest);

      // Should use ID lookup, not parameter lookup
      expect(db.getCodeAnalysisById).toHaveBeenCalledWith(1);
      expect(db.getCodeAnalysis).not.toHaveBeenCalled();
    });
  });
});
