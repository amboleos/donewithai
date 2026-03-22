# Code-Based AI Detection System - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance AI detection from commit-message-only to actual code diff analysis, distinguishing "Agentic AI" (multi-agent systems) from "Human Assisted" (normal dev with AI help).

**Architecture:** Keyword-based fast path remains. When no keyword found, fetch diff from Git API, apply smart-filter to exclude config/generated files, send to z.ai 4.5-air for analysis. Results stored in `code_analyses` table with detailed reports.

**Tech Stack:** Next.js 16, Turso/libsql, z.ai API (GLM-4.5-air), OpenAI SDK, SSE (Server-Sent Events)

---

## File Structure

### New Files
- `src/lib/smart-filter.ts` - File exclusion rules (config, generated, non-code)
- `src/lib/code-analyzer.ts` - Core analyzer with z.ai integration
- `src/app/api/ai/code-analysis/route.ts` - Admin test API endpoint
- `src/components/ai-analysis-report-modal.tsx` - Detailed analysis report UI
- `src/components/ai-analysis-progress-modal.tsx` - Real-time progress UI

### Modified Files
- `src/lib/db.ts` - Add `code_analyses` table + functions
- `src/lib/git/provider.ts` - Add `getCommitDiff()` to interface
- `src/lib/git/github-provider.ts` - Implement GitHub diff fetch
- `src/lib/git/bitbucket-provider.ts` - Implement Bitbucket diff fetch
- `src/app/api/events/route.ts` - Add new SSE event types
- `src/app/api/sync/route.ts` - Integrate code analysis after keyword check
- `src/components/admin/ai-flags-tab.tsx` - Add "AI İncele" button to rows

---

## Task 1: Database Migration - code_analyses Table

**Files:**
- Modify: `src/lib/db.ts:130-345` (initDb function)

- [ ] **Step 1: Add code_analyses table schema**

Add after the `ai_keywords` table creation (around line 304):

```typescript
// Code analysis results table
await client.execute(`
  CREATE TABLE IF NOT EXISTS code_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,        -- 'commit' | 'branch'
    source_id INTEGER NOT NULL,       -- commit.id or branch.id

    -- Analysis result
    is_agentic INTEGER NOT NULL,      -- 1 = Agentic AI, 0 = Human Assisted
    confidence REAL NOT NULL,         -- 0.0 - 1.0

    -- Detailed report (JSON)
    report TEXT NOT NULL,

    -- Metadata
    model TEXT NOT NULL,              -- 'z.ai-4.5-air'
    tokens_used INTEGER,
    duration_ms INTEGER,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
    UNIQUE(repo_id, source_type, source_id)
  )
`);

// Indexes for code_analyses
await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_repo ON code_analyses(repo_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_source ON code_analyses(source_type, source_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_code_analyses_agentic ON code_analyses(is_agentic, confidence)`);
```

- [ ] **Step 2: Add TypeScript interface and DB functions**

Add after `AIKeyword` interface (around line 128):

```typescript
export interface CodeAnalysis {
  id: number;
  repo_id: number;
  source_type: 'commit' | 'branch';
  source_id: number;
  is_agentic: number;  // 1 or 0
  confidence: number;
  report: string;  // JSON string
  model: string;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface CodeAnalysisReport {
  summary: string;
  filesAnalyzed: number;
  linesAdded: number;
  linesRemoved: number;
  patternsFound: string[];
  fileBreakdown: FileAnalysis[];
  reasoning: string;
}

export interface FileAnalysis {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  patterns: string[];
  isExcluded: boolean;
  excludeReason?: string;
}
```

Add DB functions after `getCommitsByBranchId` (around line 1056):

```typescript
// Code Analysis operations
export async function saveCodeAnalysis(
  repoId: number,
  sourceType: 'commit' | 'branch',
  sourceId: number,
  isAgentic: boolean,
  confidence: number,
  report: CodeAnalysisReport,
  model: string = 'z.ai-4.5-air',
  tokensUsed?: number,
  durationMs?: number
) {
  const result = await client.execute({
    sql: `
      INSERT INTO code_analyses (repo_id, source_type, source_id, is_agentic, confidence, report, model, tokens_used, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (repo_id, source_type, source_id) DO UPDATE SET
        is_agentic = excluded.is_agentic,
        confidence = excluded.confidence,
        report = excluded.report,
        model = excluded.model,
        tokens_used = excluded.tokens_used,
        duration_ms = excluded.duration_ms
      RETURNING *
    `,
    args: [repoId, sourceType, sourceId, isAgentic ? 1 : 0, confidence, JSON.stringify(report), model, tokensUsed || null, durationMs || null],
  });
  return result.rows[0] as unknown as CodeAnalysis;
}

export async function getCodeAnalysis(repoId: number, sourceType: 'commit' | 'branch', sourceId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM code_analyses WHERE repo_id = ? AND source_type = ? AND source_id = ?`,
    args: [repoId, sourceType, sourceId],
  });
  return result.rows[0] as unknown as CodeAnalysis | undefined;
}

export async function getCodeAnalysisById(id: number) {
  const result = await client.execute({
    sql: `SELECT * FROM code_analyses WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as CodeAnalysis | undefined;
}
```

- [ ] **Step 3: Verify migration**

Run the app and call `/api/init-db` to trigger migration:

```bash
curl -X POST http://localhost:3000/api/init-db
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): add code_analyses table for AI detection reports"
```

---

## Task 2: Smart-Filter Utility

**Files:**
- Create: `src/lib/smart-filter.ts`

- [ ] **Step 1: Create smart-filter module**

```typescript
// src/lib/smart-filter.ts

export interface FilteredFile {
  path: string;
  additions: number;
  deletions: number;
  content: string;
  isExcluded: boolean;
  excludeReason?: string;
  language: string;
}

export interface DiffStats {
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
}

// Patterns for files to exclude from AI analysis
const EXCLUDE_PATTERNS = {
  config: [
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.env$/,
    /\.env\./,
    /tsconfig\.json$/,
    /tsconfig\..*\.json$/,
    /jsconfig\.json$/,
    /manifest\.json$/,
    /\.eslintrc/,
    /\.prettierrc/,
    /tailwind\.config/,
    /postcss\.config/,
    /vite\.config/,
    /next\.config/,
    /vercel\.json/,
  ],
  generated: [
    /\/dist\//,
    /\/build\//,
    /\/node_modules\//,
    /\/.next\//,
    /\/.turbo\//,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.d\.ts$/,
    /\.d\.map$/,
    /__generated__\//,
    /\.generated\./,
  ],
  nonCode: [
    /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/,
    /\.(woff|woff2|ttf|eot|otf)$/,
    /\.(mp4|mp3|wav|ogg|webm)$/,
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/,
    /\.(zip|tar|gz|rar|7z)$/,
    /\.(sqlite|db|sql)$/,
  ],
  binary: [
    /\.wasm$/,
    /\.so$/,
    /\.dll$/,
    /\.dylib$/,
    /\.exe$/,
    /\.bin$/,
  ],
};

// Language detection from file extension
const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  vue: 'vue',
  svelte: 'svelte',
  scss: 'scss',
  css: 'css',
  html: 'html',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
};

function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function detectLanguage(path: string): string {
  const ext = getFileExtension(path);
  return LANGUAGE_MAP[ext] || 'unknown';
}

function shouldExclude(path: string): { exclude: boolean; reason?: string } {
  // Check each category
  for (const [category, patterns] of Object.entries(EXCLUDE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(path)) {
        return { exclude: true, reason: `${category} file` };
      }
    }
  }

  // Also exclude if file extension is not a known code language
  const ext = getFileExtension(path);
  if (ext && !LANGUAGE_MAP[ext]) {
    // Allow files without extensions (like Makefile, Dockerfile)
    if (!ext) return { exclude: false };
    // Exclude unknown extensions that are likely not code
    if (ext.length > 5) {
      return { exclude: true, reason: 'unknown file type' };
    }
  }

  return { exclude: false };
}

/**
 * Filter and categorize files from a diff
 */
export function filterDiffFiles(
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    content?: string;
  }>
): { filtered: FilteredFile[]; stats: DiffStats } {
  const filtered: FilteredFile[] = [];
  const stats: DiffStats = {
    totalFiles: files.length,
    includedFiles: 0,
    excludedFiles: 0,
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
  };

  for (const file of files) {
    const { exclude, reason } = shouldExclude(file.path);

    const filteredFile: FilteredFile = {
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
      content: file.content || '',
      isExcluded: exclude,
      excludeReason: reason,
      language: detectLanguage(file.path),
    };

    filtered.push(filteredFile);

    if (exclude) {
      stats.excludedFiles++;
    } else {
      stats.includedFiles++;
      stats.totalLinesAdded += file.additions;
      stats.totalLinesRemoved += file.deletions;
    }
  }

  return { filtered, stats };
}

/**
 * Format filtered diff for LLM analysis
 * Returns a string with only the relevant code changes
 */
export function formatDiffForLLM(filtered: FilteredFile[], maxTokens: number = 8000): string {
  const included = filtered.filter(f => !f.isExcluded);

  if (included.length === 0) {
    return 'No code files to analyze (all files were excluded).';
  }

  const parts: string[] = [];
  let estimatedTokens = 0;

  // Rough token estimation: ~4 chars per token
  const estimateTokens = (str: string) => Math.ceil(str.length / 4);

  for (const file of included) {
    const header = `\n--- ${file.path} (${file.language}) +${file.additions}/-${file.deletions} ---\n`;
    const headerTokens = estimateTokens(header);
    const contentTokens = estimateTokens(file.content);

    if (estimatedTokens + headerTokens + contentTokens > maxTokens) {
      // Include file info but truncate content
      parts.push(header);
      parts.push('[Content truncated due to size limits]\n');
      break;
    }

    parts.push(header);
    if (file.content) {
      parts.push(file.content.substring(0, 3000)); // Max 3k chars per file
    }
    parts.push('\n');

    estimatedTokens += headerTokens + contentTokens;
  }

  return parts.join('');
}
```

- [ ] **Step 2: Verify the module compiles**

```bash
npx tsc --noEmit src/lib/smart-filter.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/smart-filter.ts
git commit -m "feat: add smart-filter utility for code analysis"
```

---

## Task 3: Git Provider Diff Methods

**Files:**
- Modify: `src/lib/git/provider.ts`
- Modify: `src/lib/git/github-provider.ts`
- Modify: `src/lib/git/bitbucket-provider.ts`

- [ ] **Step 1: Add getCommitDiff to GitProvider interface**

Add to `src/lib/git/provider.ts` (after `getCommitDiffstat`):

```typescript
export interface GitProvider {
  getRepoInfo(url: string): Promise<GitRepoInfo>;
  getCommits(url: string, since?: Date): Promise<GitCommit[]>;
  getBranches(url: string): Promise<GitBranch[]>;
  getBranchCommitCount?(url: string, branchName: string): Promise<number>;
  getCommitDiffstat?(url: string, sha: string): Promise<{ additions: number; deletions: number }>;
  // NEW: Get full diff content for a commit
  getCommitDiff?(url: string, sha: string): Promise<CommitDiff>;
  setupWebhook?(url: string, webhookUrl: string, secret?: string): Promise<void>;
}

// NEW: Diff types
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
```

- [ ] **Step 2: Implement GitHub getCommitDiff**

Add to `src/lib/git/github-provider.ts` after `extractRepoNameFromUrl`:

```typescript
async getCommitDiff(url: string, sha: string): Promise<CommitDiff> {
  const { owner, repo } = this.parseRepoUrl(url);

  const { data } = await this.octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  });

  const files: CommitDiffFile[] = [];

  for (const file of data.files || []) {
    files.push({
      path: file.filename,
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      content: file.patch || '',
    });
  }

  return {
    sha: data.sha,
    files,
    totalAdditions: data.stats?.additions || 0,
    totalDeletions: data.stats?.deletions || 0,
  };
}
```

Add import at top:
```typescript
import type { GitProvider, GitCommit, GitBranch, GitRepoInfo, CommitDiff } from './provider';
```

- [ ] **Step 3: Implement Bitbucket getCommitDiff**

Add to `src/lib/git/bitbucket-provider.ts` after `getCommitDiffstat`:

```typescript
async getCommitDiff(url: string, sha: string): Promise<CommitDiff> {
  const { workspace, repoSlug } = this.parseRepoUrl(url);
  const apiUrl = `${BITBUCKET_API_BASE}/repositories/${workspace}/${repoSlug}/diff/${sha}`;

  const response = await fetchWithRetry(apiUrl, this.token);
  const diffText = await response.text();

  // Parse unified diff format
  const files: CommitDiffFile[] = [];
  const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] || '';

    // Extract filename from "a/path/to/file b/path/to/file"
    const match = headerLine.match(/^a\/(.+?)\s+b\/(.+?)(?:\s|$)/);
    const path = match ? match[2] : headerLine.split(' ')[0] || 'unknown';

    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions++;
      if (line.startsWith('-') && !line.startsWith('---')) deletions++;
    }

    totalAdditions += additions;
    totalDeletions += deletions;

    files.push({
      path,
      additions,
      deletions,
      content: block,
    });
  }

  return {
    sha,
    files,
    totalAdditions,
    totalDeletions,
  };
}
```

Add import at top:
```typescript
import type { GitProvider, GitCommit, GitBranch, GitRepoInfo, CommitDiff } from './provider';
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit src/lib/git/*.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/git/provider.ts src/lib/git/github-provider.ts src/lib/git/bitbucket-provider.ts
git commit -m "feat(git): add getCommitDiff method for code analysis"
```

---

## Task 4: Code Analyzer Core

**Files:**
- Create: `src/lib/code-analyzer.ts`

- [ ] **Step 1: Create code analyzer module**

```typescript
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
- Agentic AI: Multi-agent systems (brainstorm → planning → execution), coordinated multi-file changes, structured approach with clear goals, typically includes tests, new modules, type definitions.
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit src/lib/code-analyzer.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/code-analyzer.ts
git commit -m "feat: add code analyzer with z.ai integration"
```

---

## Task 5: Admin Test API Endpoint

**Files:**
- Create: `src/app/api/ai/code-analysis/route.ts`

- [ ] **Step 1: Create API endpoint for manual analysis**

```typescript
// src/app/api/ai/code-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { getRepoById, getCodeAnalysis, saveCodeAnalysis, getCommitById, getBranchById } from '@/lib/db';
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
    let sha: string;
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
      // For branches, use the tip commit
      // TODO: In future, aggregate all branch commits
      return NextResponse.json({
        error: 'Branch analysis not yet implemented. Use commit analysis.',
      }, { status: 400 });
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
    const token = process.env[tokenEnvVar];

    if (!token) {
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
    const result = await analyzer.analyzeCommit(repo.url, sha, provider, emitProgress);

    // Save to DB
    const saved = await saveCodeAnalysis(
      repoId,
      sourceType,
      sourceId,
      result.isAgentic,
      result.confidence,
      result.report,
      result.model || 'z.ai-4.5-air',
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
        report: JSON.parse(analysis.report),
      },
    });
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}
```

- [ ] **Step 2: Add getCodeAnalysisById import to db.ts if missing**

Make sure `getCodeAnalysisById` is exported from `src/lib/db.ts` (added in Task 1).

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit src/app/api/ai/code-analysis/route.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/code-analysis/route.ts
git commit -m "feat(api): add code analysis endpoint for admin testing"
```

---

## Task 6: SSE Events for Code Analysis

**Files:**
- Modify: `src/app/api/events/route.ts`

- [ ] **Step 1: Add new event types to SyncEvent union**

Update the `SyncEvent` type in `src/app/api/events/route.ts` (around line 9-19):

```typescript
// SSE event type definitions
export type SyncEvent =
  | { type: 'sync_starting'; data: { message: string; syncType: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'sync_started'; data: { repoId: number; repoName: string; totalCommits: number; timestamp: string } }
  | { type: 'fetching_commits'; data: { message: string } }
  | { type: 'processing_commits'; data: { repoId: number; processed: number; total: number; percentage: number; currentCommit: string } }
  | { type: 'fetching_branches'; data: { page: number; message: string } }
  | { type: 'branches_fetched'; data: { total: number; new: number } }
  | { type: 'sync_completed'; data: { repoId: number; aiJobsFound: number; duration: number; syncType?: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'ai_tagged'; data: { type: 'commit' | 'branch'; id: number; userName: string; reason?: string } }
  | { type: 'sync_error'; data: { error: string; syncType?: 'incremental' | 'full' | 'ai_recheck' } }
  | { type: 'ai_recheck_progress'; data: { repoId: number; processed: number; total: number; aiFound: number } }
  // NEW: Code analysis events
  | { type: 'code_analysis_started'; data: { repoId: number; sourceType: 'commit' | 'branch'; sourceId: number } }
  | { type: 'code_analysis_progress'; data: { repoId: number; sourceType: 'commit' | 'branch'; sourceId: number; stage: string; message: string } }
  | { type: 'code_analysis_completed'; data: { id: number; repoId: number; sourceType: 'commit' | 'branch'; sourceId: number; isAgentic: boolean; confidence: number; summary: string } }
  | { type: 'code_analysis_error'; data: { error: string } };
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/events/route.ts
git commit -m "feat(sse): add code analysis event types"
```

---

## Task 7: Sync Integration

**Files:**
- Modify: `src/app/api/sync/route.ts`

- [ ] **Step 1: Import CodeAnalyzer**

Add at top of `src/app/api/sync/route.ts`:

```typescript
import { CodeAnalyzer } from '@/lib/code-analyzer';
```

- [ ] **Step 2: Integrate code analysis in commit loop**

Find the section around line 186-204 where AI detection happens. Modify to add code analysis after keyword check fails:

Replace this block:
```typescript
      // NEW AI DETECTION LOGIC: Keyword check → LLM decision
      const detection = await detector.detectFromCommitMessage(commit.message);

      if (detection.isAI && detection.confidence > 0.5) {
        console.log('[SYNC] ✅ AI COMMIT:', commit.sha.substring(0, 8), '|', commit.message.substring(0, 50), '| confidence:', detection.confidence.toFixed(2), '|', detection.reason);
        await updateCommitAIDetection(dbCommit.id, true, detection.confidence);
        aiJobsCreated++;
        eventEmitter.emit({
          type: 'ai_tagged',
          data: {
            type: 'commit',
            id: dbCommit.id,
            userName: commit.author,
            reason: detection.reason,
          },
        });
      } else {
        await updateCommitAIDetection(dbCommit.id, false, detection.confidence);
      }
```

With:
```typescript
      // NEW AI DETECTION LOGIC: Keyword check → Code Analysis
      const detection = await detector.detectFromCommitMessage(commit.message);

      if (detection.isAI && detection.confidence > 0.5) {
        // Fast path: keyword found
        console.log('[SYNC] ✅ AI COMMIT (keyword):', commit.sha.substring(0, 8), '| confidence:', detection.confidence.toFixed(2));
        await updateCommitAIDetection(dbCommit.id, true, detection.confidence);
        aiJobsCreated++;
        eventEmitter.emit({
          type: 'ai_tagged',
          data: {
            type: 'commit',
            id: dbCommit.id,
            userName: commit.author,
            reason: detection.reason,
          },
        });
      } else {
        // Slow path: No keyword found, run code analysis
        const codeAnalyzer = new CodeAnalyzer(process.env.ZAI_API_KEY);

        if (codeAnalyzer.canAnalyze() && provider.getCommitDiff) {
          try {
            eventEmitter.emit({
              type: 'code_analysis_started',
              data: { repoId: repo.id, sourceType: 'commit', sourceId: dbCommit.id },
            });

            const analysis = await codeAnalyzer.analyzeCommit(
              repo.url,
              commit.sha,
              provider,
              (stage, message) => {
                eventEmitter.emit({
                  type: 'code_analysis_progress',
                  data: { repoId: repo.id, sourceType: 'commit', sourceId: dbCommit.id, stage, message },
                });
              }
            );

            // Save analysis result
            await saveCodeAnalysis(
              repo.id,
              'commit',
              dbCommit.id,
              analysis.isAgentic,
              analysis.confidence,
              analysis.report,
              'z.ai-4.5-air',
              analysis.tokensUsed,
              analysis.durationMs
            );

            // Update commit AI detection based on analysis
            const isAI = analysis.isAgentic; // Agentic AI = AI detected
            await updateCommitAIDetection(dbCommit.id, isAI, analysis.confidence);

            if (isAI) {
              console.log('[SYNC] ✅ AI COMMIT (code analysis):', commit.sha.substring(0, 8), '| agentic:', analysis.isAgentic, '| confidence:', analysis.confidence.toFixed(2));
              aiJobsCreated++;
            }

            eventEmitter.emit({
              type: 'code_analysis_completed',
              data: {
                id: dbCommit.id,
                repoId: repo.id,
                sourceType: 'commit',
                sourceId: dbCommit.id,
                isAgentic: analysis.isAgentic,
                confidence: analysis.confidence,
                summary: analysis.report.summary,
              },
            });
          } catch (error: any) {
            console.error('[SYNC] Code analysis failed for', commit.sha.substring(0, 8), ':', error.message);
            // Fallback to keyword-based result
            await updateCommitAIDetection(dbCommit.id, false, detection.confidence);
          }
        } else {
          // No code analysis available, use keyword result
          await updateCommitAIDetection(dbCommit.id, false, detection.confidence);
        }
      }
```

- [ ] **Step 3: Add saveCodeAnalysis import**

Add to imports at top:
```typescript
import {
  // ... existing imports
  saveCodeAnalysis,
} from '@/lib/db';
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit src/app/api/sync/route.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sync/route.ts
git commit -m "feat(sync): integrate code-based AI analysis after keyword check"
```

---

## Task 8: UI - Analyze Button in Admin Flags Tab

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add analyze button and state**

Add imports:
```typescript
import { Sparkles, Loader2 } from 'lucide-react';
```

Add state after existing useState hooks:
```typescript
const [analyzingId, setAnalyzingId] = useState<number | null>(null);
const [analysisResult, setAnalysisResult] = useState<any | null>(null);
```

Add analyze function after `toggleAI`:
```typescript
const analyzeCode = async (repoId: number, sourceType: 'commit' | 'branch', sourceId: number) => {
  setAnalyzingId(sourceId);
  try {
    const res = await fetch('/api/ai/code-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId, sourceType, sourceId }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Analysis failed');
    }

    const data = await res.json();
    setAnalysisResult(data.analysis);
    toast.success('Code analysis completed');

    // Refresh data to show updated AI status
    fetchData();
  } catch (error: any) {
    toast.error(error.message || 'Analysis failed');
  } finally {
    setAnalyzingId(null);
  }
};
```

- [ ] **Step 2: Add analyze button to commits table**

In the commits table, add a new "ANALYZE" button in the ACTION column. Find the button in the commit row (around line 297-308) and add after it:

```typescript
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Analyze Button */}
                          <button
                            onClick={() => analyzeCode(commit.repo_id, 'commit', commit.id)}
                            disabled={analyzingId === commit.id}
                            title="Analyze code for AI patterns"
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1
                              ${analyzingId === commit.id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                              }
                            `}
                          >
                            {analyzingId === commit.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                ANALYZING
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                ANALYZE
                              </>
                            )}
                          </button>

                          {/* Toggle AI Button */}
                          <button
                            onClick={() => toggleAI('commit', commit.id, commit.is_ai_detected)}
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors
                              ${commit.is_ai_detected
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                              }
                            `}
                          >
                            {commit.is_ai_detected ? 'SET_HUMAN' : 'SET_AI'}
                          </button>
                        </div>
                      </td>
```

- [ ] **Step 3: Add analyze button to branches table**

Similarly, update the branches table ACTION column (around line 368-381):

```typescript
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Analyze Button */}
                          <button
                            onClick={() => analyzeCode(branch.repo_id, 'branch', branch.id)}
                            disabled={analyzingId === branch.id}
                            title="Analyze code for AI patterns"
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1
                              ${analyzingId === branch.id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                              }
                            `}
                          >
                            {analyzingId === branch.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                ANALYZING
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                ANALYZE
                              </>
                            )}
                          </button>

                          {/* Toggle AI Button */}
                          <button
                            onClick={() => toggleAI('branch', branch.id, branch.is_ai_detected)}
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors
                              ${branch.is_ai_detected
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                              }
                            `}
                          >
                            {branch.is_ai_detected ? 'SET_HUMAN' : 'SET_AI'}
                          </button>
                        </div>
                      </td>
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit src/components/admin/ai-flags-tab.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ui): add code analysis button to admin AI flags tab"
```

---

## Task 9: UI - Analysis Report Modal

**Files:**
- Create: `src/components/ai-analysis-report-modal.tsx`

- [ ] **Step 1: Create report modal component**

```typescript
// src/components/ai-analysis-report-modal.tsx
'use client';

import { X, Brain, User, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { CodeAnalysisReport } from '@/lib/db';

interface AnalysisReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: {
    id: number;
    isAgentic: boolean;
    confidence: number;
    report: CodeAnalysisReport;
    model: string;
    durationMs?: number;
    tokensUsed?: number;
  } | null;
}

export default function AnalysisReportModal({ isOpen, onClose, analysis }: AnalysisReportModalProps) {
  if (!isOpen || !analysis) return null;

  const { isAgentic, confidence, report, model, durationMs, tokensUsed } = analysis;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {isAgentic ? (
              <div className="p-2 bg-purple-500/20 rounded border border-purple-500/30">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
            ) : (
              <div className="p-2 bg-green-500/20 rounded border border-green-500/30">
                <User className="h-5 w-5 text-green-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white font-mono">
                {isAgentic ? 'AGENTIC AI' : 'HUMAN ASSISTED'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {model} • {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-white">{confidencePercent}%</div>
              <div className="text-xs text-slate-400 font-mono">confidence</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Summary */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <h3 className="text-sm font-bold text-green-500 font-mono mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              SUMMARY
            </h3>
            <p className="text-slate-300 text-sm font-mono leading-relaxed">
              {report.summary}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-white font-mono">{report.filesAnalyzed}</div>
              <div className="text-xs text-slate-400 font-mono">files analyzed</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-green-400 font-mono">+{report.linesAdded}</div>
              <div className="text-xs text-slate-400 font-mono">lines added</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-red-400 font-mono">-{report.linesRemoved}</div>
              <div className="text-xs text-slate-400 font-mono">lines removed</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-400 font-mono">{tokensUsed || 'N/A'}</div>
              <div className="text-xs text-slate-400 font-mono">tokens used</div>
            </div>
          </div>

          {/* Patterns Found */}
          {report.patternsFound.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-green-500 font-mono mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                PATTERNS FOUND
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.patternsFound.map((pattern, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs font-mono"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Breakdown */}
          {report.fileBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-green-500 font-mono mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                FILE BREAKDOWN
              </h3>
              <div className="space-y-2">
                {report.fileBreakdown.slice(0, 15).map((file, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded border ${
                      file.isExcluded
                        ? 'bg-slate-800/30 border-slate-700 text-slate-500'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.isExcluded ? (
                        <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-sm font-mono truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-slate-400">{file.language}</span>
                      <span className="text-xs font-mono text-green-400">+{file.additions}</span>
                      <span className="text-xs font-mono text-red-400">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
                {report.fileBreakdown.length > 15 && (
                  <div className="text-xs text-slate-500 font-mono text-center py-2">
                    +{report.fileBreakdown.length - 15} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <h3 className="text-sm font-bold text-green-500 font-mono mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              REASONING
            </h3>
            <p className="text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {report.reasoning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate modal in ai-flags-tab**

Add to `src/components/admin/ai-flags-tab.tsx`:

Import:
```typescript
import AnalysisReportModal from '@/components/ai-analysis-report-modal';
```

Add modal after the tables (before closing div):
```typescript
      {/* Analysis Report Modal */}
      <AnalysisReportModal
        isOpen={!!analysisResult}
        onClose={() => setAnalysisResult(null)}
        analysis={analysisResult}
      />
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit src/components/ai-analysis-report-modal.tsx src/components/admin/ai-flags-tab.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ai-analysis-report-modal.tsx src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ui): add analysis report modal with detailed breakdown"
```

---

## Task 10: UI - Real-time Progress Modal

**Files:**
- Create: `src/components/ai-analysis-progress-modal.tsx`

- [ ] **Step 1: Create progress modal component**

```typescript
// src/components/ai-analysis-progress-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, GitCommit, Filter, Brain, CheckCircle } from 'lucide-react';

interface ProgressStage {
  stage: string;
  message: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  sourceType: 'commit' | 'branch';
  sourceId: number;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const STAGE_ICONS: Record<string, any> = {
  fetching: GitCommit,
  filtering: Filter,
  formatting: Brain,
  analyzing: Brain,
  completed: CheckCircle,
};

export default function AnalysisProgressModal({
  isOpen,
  sourceType,
  sourceId,
  onComplete,
  onError,
}: ProgressModalProps) {
  const [stage, setStage] = useState<string>('fetching');
  const [message, setMessage] = useState<string>('Initializing...');
  const [patterns, setPatterns] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'code_analysis_progress') {
          if (data.data.sourceId === sourceId) {
            setStage(data.data.stage);
            setMessage(data.data.message);
          }
        }

        if (data.type === 'code_analysis_completed') {
          if (data.data.sourceId === sourceId) {
            setStage('completed');
            setMessage('Analysis complete!');
            setTimeout(() => {
              onComplete?.(data.data);
              eventSource.close();
            }, 500);
          }
        }

        if (data.type === 'code_analysis_error') {
          setMessage(data.data.error);
          onError?.(data.data.error);
          eventSource.close();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, sourceId, onComplete, onError]);

  if (!isOpen) return null;

  const StageIcon = STAGE_ICONS[stage] || Loader2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-400" />
            CODE ANALYSIS
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {sourceType === 'commit' ? `Commit #${sourceId}` : `Branch #${sourceId}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Animation */}
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full border-2 ${
              stage === 'completed'
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-amber-500/20 border-amber-500/50'
            }`}>
              <StageIcon className={`h-8 w-8 ${
                stage === 'completed' ? 'text-green-400' : 'text-amber-400'
              } ${stage !== 'completed' ? 'animate-spin' : ''}`} />
            </div>

            {/* Stage Text */}
            <div className="text-center">
              <div className="text-sm font-bold text-white font-mono uppercase">
                {stage}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                {message}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  stage === 'completed' ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{
                  width: stage === 'fetching' ? '25%' :
                         stage === 'filtering' ? '50%' :
                         stage === 'formatting' ? '65%' :
                         stage === 'analyzing' ? '85%' :
                         '100%'
                }}
              />
            </div>

            {/* Stage Indicators */}
            <div className="flex items-center gap-2 text-xs font-mono">
              {['fetching', 'filtering', 'formatting', 'analyzing'].map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-1 ${
                    ['fetching', 'filtering', 'formatting', 'analyzing', 'completed'].indexOf(stage) >= i
                      ? 'text-amber-400'
                      : 'text-slate-600'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    ['fetching', 'filtering', 'formatting', 'analyzing', 'completed'].indexOf(stage) >= i
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`} />
                  <span className="hidden sm:inline">{s}</span>
                </div>
              ))}
            </div>

            {/* Patterns Found (animated) */}
            {patterns.length > 0 && (
              <div className="w-full flex flex-wrap gap-2 mt-4">
                {patterns.map((p, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs font-mono animate-pulse"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate in ai-flags-tab**

Add to `src/components/admin/ai-flags-tab.tsx`:

Import:
```typescript
import AnalysisProgressModal from '@/components/ai-analysis-progress-modal';
```

Add state:
```typescript
const [showProgress, setShowProgress] = useState(false);
const [progressSourceId, setProgressSourceId] = useState<number | null>(null);
```

Update `analyzeCode` function:
```typescript
const analyzeCode = async (repoId: number, sourceType: 'commit' | 'branch', sourceId: number) => {
  setProgressSourceId(sourceId);
  setShowProgress(true);
  // ... rest of function
};
```

Add modal in JSX:
```typescript
      {/* Progress Modal */}
      <AnalysisProgressModal
        isOpen={showProgress}
        sourceType="commit"
        sourceId={progressSourceId || 0}
        onComplete={(result) => {
          setShowProgress(false);
          setAnalysisResult(result);
        }}
        onError={(error) => {
          setShowProgress(false);
          toast.error(error);
        }}
      />
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit src/components/ai-analysis-progress-modal.tsx src/components/admin/ai-flags-tab.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ai-analysis-progress-modal.tsx src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ui): add real-time progress modal for code analysis"
```

---

## Final Verification

- [ ] **Run full build**

```bash
npm run build
```

Expected: No errors

- [ ] **Run linter**

```bash
npm run lint
```

Expected: No critical errors

- [ ] **Manual test**

1. Start dev server: `npm run dev`
2. Login as admin
3. Go to Admin > AI Flags
4. Click "ANALYZE" button on a commit
5. Verify progress modal appears
6. Verify report modal shows after completion

- [ ] **Final commit (if any fixes needed)**

```bash
git add .
git commit -m "fix: final cleanup for code-based AI detection"
```
