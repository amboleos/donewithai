// src/lib/code-analyzer.ts
import OpenAI from 'openai';
import { filterDiffFiles, formatDiffForLLM, type FilteredFile, type DiffStats } from './smart-filter';
import type { GitProvider, CommitDiff } from './git/provider';
import type { CodeAnalysisReport, FileAnalysis } from './db';

export interface CodeAnalysisResult {
  isAgentic: boolean;
  confidence: number;
  report: CodeAnalysisReport;
  tokensUsed?: number;
  durationMs: number;
}

export class CodeAnalyzer {
  private client: OpenAI | null = null;
  private model: string;

  constructor(apiKey?: string, model: string = 'glm-4.5-air') {
    this.model = model;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.z.ai/api/coding/paas/v4',
      });
    }
  }

  canAnalyze(): boolean {
    return this.client !== null;
  }

  /**
   * Analyze a commit's diff to determine if it's Agentic AI or Human Assisted
   */
  async analyzeCommit(
    url: string,
    sha: string,
    provider: GitProvider,
    onProgress?: (stage: string, message: string) => void
  ): Promise<CodeAnalysisResult> {
    const startTime = Date.now();

    if (!this.client) {
      throw new Error('z.ai API key not configured');
    }

    if (!provider.getCommitDiff) {
      throw new Error('Git provider does not support diff fetching');
    }

    // Stage 1: Fetch diff
    onProgress?.('fetching', 'Fetching commit diff...');
    console.log('[CodeAnalyzer] Fetching diff for', sha);

    const diff = await provider.getCommitDiff(url, sha);
    console.log('[CodeAnalyzer] Diff fetched:', diff.files.length, 'files');

    // Stage 2: Apply smart-filter
    onProgress?.('filtering', 'Applying smart-filter...');
    const { filtered, stats } = filterDiffFiles(
      diff.files.map(f => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        content: f.content,
      }))
    );

    console.log('[CodeAnalyzer] Filtered:', stats.includedFiles, 'included,', stats.excludedFiles, 'excluded');

    // Stage 3: Format for LLM
    onProgress?.('formatting', 'Preparing analysis...');
    const formattedDiff = formatDiffForLLM(filtered);

    // Stage 4: Analyze with LLM
    onProgress?.('analyzing', 'Analyzing with z.ai...');
    const analysisResult = await this.analyzeWithLLM(formattedDiff, stats, filtered);

    const durationMs = Date.now() - startTime;

    return {
      ...analysisResult,
      durationMs,
    };
  }

  /**
   * Call z.ai LLM to analyze the diff
   */
  private async analyzeWithLLM(
    formattedDiff: string,
    stats: DiffStats,
    filtered: FilteredFile[]
  ): Promise<CodeAnalysisResult & { tokensUsed?: number }> {
    if (!this.client) {
      throw new Error('z.ai client not initialized');
    }

    const prompt = `Analyze this code diff to determine if it's "Agentic AI" or "Human Assisted".

DEFINITIONS:
- Agentic AI: Multi-agent systems (brainstorm -> planning -> execution), coordinated multi-file changes, structured approach with clear goals, typically includes tests, new modules, type definitions.
- Human Assisted: Developer using AI for small tasks (write this function, fix this bug), iterative single-loop changes, inline modifications.

DIFF DATA:
${formattedDiff}

METADATA:
- Files changed: ${stats.totalFiles}
- Files analyzed: ${stats.includedFiles}
- Lines added: ${stats.totalLinesAdded}
- Lines removed: ${stats.totalLinesRemoved}

ANALYZE FOR:
1. Scope: Multi-file coordination vs single file
2. Patterns: New test suites, new modules, index exports, type definitions
3. Size: Significant changes (500+ lines) suggest planning
4. Coherence: Do changes across files tell a coherent story?

RESPOND IN JSON ONLY (no markdown, no code blocks):
{
  "isAgentic": boolean,
  "confidence": 0.0-1.0,
  "patternsFound": ["pattern1", "pattern2"],
  "reasoning": "Why this decision was made",
  "fileBreakdown": [{"path": "...", "analysis": "..."}]
}`;

    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens;

      console.log('[CodeAnalyzer] LLM response length:', content.length);

      // Parse JSON response
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Build file breakdown from filtered files
      const fileBreakdown: FileAnalysis[] = filtered.slice(0, 20).map(f => ({
        path: f.path,
        language: f.language,
        additions: f.additions,
        deletions: f.deletions,
        patterns: [],
        isExcluded: f.isExcluded,
        excludeReason: f.excludeReason,
      }));

      const report: CodeAnalysisReport = {
        summary: parsed.reasoning || 'Analysis completed',
        filesAnalyzed: stats.includedFiles,
        linesAdded: stats.totalLinesAdded,
        linesRemoved: stats.totalLinesRemoved,
        patternsFound: parsed.patternsFound || [],
        fileBreakdown,
        reasoning: parsed.reasoning || '',
      };

      return {
        isAgentic: Boolean(parsed.isAgentic),
        confidence: Math.min(1.0, Math.max(0.0, Number(parsed.confidence) || 0.5)),
        report,
        tokensUsed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[CodeAnalyzer] LLM error:', error);

      // Fallback: Use heuristics based on diff stats
      const isLikelyAgentic =
        stats.includedFiles >= 3 ||
        stats.totalLinesAdded >= 500 ||
        (stats.totalLinesAdded + stats.totalLinesRemoved) >= 800;

      const report: CodeAnalysisReport = {
        summary: 'Analysis based on heuristics (LLM failed)',
        filesAnalyzed: stats.includedFiles,
        linesAdded: stats.totalLinesAdded,
        linesRemoved: stats.totalLinesRemoved,
        patternsFound: isLikelyAgentic ? ['multi-file changes', 'significant size'] : [],
        fileBreakdown: filtered.slice(0, 10).map(f => ({
          path: f.path,
          language: f.language,
          additions: f.additions,
          deletions: f.deletions,
          patterns: [],
          isExcluded: f.isExcluded,
          excludeReason: f.excludeReason,
        })),
        reasoning: `LLM analysis failed. Heuristic analysis based on ${stats.includedFiles} files, ${stats.totalLinesAdded} additions, ${stats.totalLinesRemoved} deletions.`,
      };

      return {
        isAgentic: isLikelyAgentic,
        confidence: 0.4,
        report,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
