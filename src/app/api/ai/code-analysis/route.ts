// src/app/api/ai/code-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { getRepoById, getCodeAnalysis, getCodeAnalysisById, saveCodeAnalysis, getCommitById, getBranchById } from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName } from '@/lib/git';
import { CodeAnalyzer } from '@/lib/code-analyzer';
import { eventEmitter } from '../../events/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/code-analysis
 * Trigger manual code analysis for a commit or branch
 *
 * Request body:
 * {
 *   repoId: number;
 *   sourceType: 'commit' | 'branch';
 *   sourceId: number;
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { repoId, sourceType, sourceId } = await req.json();

    if (!repoId || !sourceType || !sourceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sourceType !== 'commit' && sourceType !== 'branch') {
      return NextResponse.json({ error: 'Invalid sourceType' }, { status: 400 });
    }

    // Get repo
    const repo = await getRepoById(repoId);
    if (!repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Check for existing analysis
    const existing = await getCodeAnalysis(repoId, sourceType, sourceId);
    if (existing) {
      return NextResponse.json({
        success: true,
        cached: true,
        analysis: {
          id: existing.id,
          isAgentic: existing.is_agentic === 1,
          confidence: existing.confidence,
          report: JSON.parse(existing.report),
          model: existing.model,
          durationMs: existing.duration_ms,
        },
      });
    }

    // Get commit SHA or branch info
    let sha: string | null = null;
    let branchName: string | null = null;

    if (sourceType === 'commit') {
      const commit = await getCommitById(sourceId);
      if (!commit || commit.repo_id !== repoId) {
        return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
      }
      sha = commit.sha;
    } else {
      const branch = await getBranchById(sourceId);
      if (!branch || branch.repo_id !== repoId) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }
      branchName = branch.name;
    }

    // Emit progress events
    const emitProgress = (stage: string, message: string) => {
      eventEmitter.emit({
        type: 'code_analysis_progress',
        data: { repoId, sourceType, sourceId, stage, message },
      });
    };

    eventEmitter.emit({
      type: 'code_analysis_started',
      data: { repoId, sourceType, sourceId },
    });

    // Create provider
    const parsed = parseRepoUrl(repo.url);
    const tokenEnvVar = getEnvVarName(repo.name, parsed.provider);
    const token = tokenEnvVar ? process.env[tokenEnvVar] : null;

    if (tokenEnvVar && !token) {
      return NextResponse.json({
        error: `Token not found: ${tokenEnvVar}`,
      }, { status: 400 });
    }

    const provider = createProvider(repo.url);

    // Initialize analyzer
    const analyzer = new CodeAnalyzer(process.env.ZAI_API_KEY);
    if (!analyzer.canAnalyze()) {
      return NextResponse.json({
        error: 'z.ai API key not configured',
      }, { status: 400 });
    }

    // Run analysis
    const startTime = Date.now();
    let result;

    if (sourceType === 'commit' && sha) {
      result = await analyzer.analyzeCommit(repo.url, sha, provider, emitProgress);
    } else if (sourceType === 'branch' && branchName) {
      result = await analyzer.analyzeBranch(repo.url, branchName, provider, undefined, emitProgress);
    } else {
      return NextResponse.json({
        error: 'Invalid source configuration',
      }, { status: 400 });
    }

    // Save to DB
    const saved = await saveCodeAnalysis(
      repoId,
      sourceType,
      sourceId,
      result.isAgentic,
      result.confidence,
      result.report,
      'z.ai-4.5-air',
      result.tokensUsed,
      result.durationMs
    );

    // Emit completion
    eventEmitter.emit({
      type: 'code_analysis_completed',
      data: {
        id: saved.id,
        repoId,
        sourceType,
        sourceId,
        isAgentic: result.isAgentic,
        confidence: result.confidence,
        summary: result.report.summary,
      },
    });

    return NextResponse.json({
      success: true,
      cached: false,
      analysis: {
        id: saved.id,
        isAgentic: result.isAgentic,
        confidence: result.confidence,
        report: result.report,
        model: saved.model,
        tokensUsed: saved.tokens_used,
        durationMs: saved.duration_ms,
      },
    });
  } catch (error: any) {
    console.error('[CodeAnalysis API] Error:', error);

    eventEmitter.emit({
      type: 'code_analysis_error',
      data: { error: error.message || 'Unknown error' },
    });

    return NextResponse.json({
      error: error.message || 'Analysis failed',
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/code-analysis?id=123
 * Get existing analysis by ID
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const repoId = searchParams.get('repoId');
  const sourceType = searchParams.get('sourceType') as 'commit' | 'branch' | null;
  const sourceId = searchParams.get('sourceId');

  if (id) {
    const analysis = await getCodeAnalysisById(parseInt(id));
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    return NextResponse.json({
      analysis: {
        ...analysis,
        is_agentic: analysis.is_agentic === 1,
        report: JSON.parse(analysis.report),
      },
    });
  }

  if (repoId && sourceType && sourceId) {
    const analysis = await getCodeAnalysis(
      parseInt(repoId),
      sourceType,
      parseInt(sourceId)
    );
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    return NextResponse.json({
      analysis: {
        ...analysis,
        is_agentic: analysis.is_agentic === 1,
        report: JSON.parse(analysis.report),
      },
    });
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}
