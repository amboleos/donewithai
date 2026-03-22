# Code-Based AI Detection System - Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Author:** Claude Code

## Overview

AI detection sistemini commit mesajlarından actual kod analizine taşıyan enhancement. Amaç: "Agentic AI" vs "Human Assisted" ayrımı yapmak.

## Definitions

| Terim | Tanım |
|-------|-------|
| **Agentic AI** | Multi-agent sistemler (brainstorm → planning → execution), koordineli multi-file değişiklikler, planlı yapı |
| **Human Assisted** | Developer'ın AI'dan küçük yardım aldığı, iterative single-loop değişiklikler |

## Architecture

```
Commit arrives
    ↓
Keyword check (fast - existing)
    ├─ AI keyword found → is_ai_detected = 1, skip code analysis
    └─ No keyword → Code Analysis Queue
                        ↓
                   Diff fetch (Git API)
                        ↓
                   Smart-filter apply
                        ↓
                   z.ai 4.5-air analysis
                        ↓
                   Result: is_agentic + detailed report
```

## New Components

### 1. `src/lib/code-analyzer.ts`

Core analyzer module:

```typescript
export interface CodeAnalysisResult {
  isAgentic: boolean;
  confidence: number;
  report: {
    summary: string;
    filesAnalyzed: number;
    linesAdded: number;
    linesRemoved: number;
    patternsFound: string[];
    fileBreakdown: FileAnalysis[];
    reasoning: string;
  };
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

### 2. `src/lib/smart-filter.ts`

File exclusion rules:

```typescript
const EXCLUDE_PATTERNS = {
  config: [
    /package\.json$/, /package-lock\.json$/, /yarn\.lock$/, /pnpm-lock\.yaml$/,
    /\.env/, /\.env\./, /tsconfig\.json$/, /manifest\.json$/,
  ],
  generated: [
    /\/dist\//, /\/build\//, /\/node_modules\//,
    /\.min\.js$/, /\.min\.css$/, /\.d\.ts$/,
  ],
  nonCode: [
    /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
    /\.(woff|woff2|ttf|eot)$/,
    /\.(mp4|mp3|wav|pdf)$/,
  ],
};
```

### 3. Git Provider Extensions

New methods in `src/lib/git/provider.ts`:

```typescript
interface GitProvider {
  // Existing methods...

  // New methods for diff fetching
  getCommitDiff?(url: string, sha: string): Promise<string>;
  getBranchDiff?(url: string, branchName: string, baseBranch?: string): Promise<string>;
}
```

## Database Schema

### New Table: `code_analyses`

```sql
CREATE TABLE code_analyses (
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
);

CREATE INDEX idx_code_analyses_repo ON code_analyses(repo_id);
CREATE INDEX idx_code_analyses_source ON code_analyses(source_type, source_id);
CREATE INDEX idx_code_analyses_agentic ON code_analyses(is_agentic, confidence);
```

## LLM Prompt Design (z.ai 4.5-air)

```
Analyze this code diff to determine if it's "Agentic AI" or "Human Assisted".

DEFINITIONS:
- Agentic AI: Multi-agent systems (brainstorm → planning → execution),
  coordinated multi-file changes, structured approach with clear goals,
  typically includes tests, new modules, type definitions.

- Human Assisted: Developer using AI for small tasks (write this function,
  fix this bug), iterative single-loop changes, inline modifications.

DIFF DATA:
{filtered_diff_content}

METADATA:
- Files changed: {count}
- Lines added: {additions}
- Lines removed: {deletions}

ANALYZE FOR:
1. Scope: Multi-file coordination vs single file
2. Patterns: New test suites, new modules, index exports, type definitions
3. Size: Significant changes (500+ lines) suggest planning
4. Coherence: Do changes across files tell a coherent story?

RESPOND IN JSON:
{
  "isAgentic": boolean,
  "confidence": 0.0-1.0,
  "patternsFound": ["pattern1", "pattern2"],
  "reasoning": "Why this decision was made",
  "fileBreakdown": [{"path": "...", "analysis": "..."}]
}
```

## API Endpoints

### POST /api/ai/code-analysis

Admin test endpoint:

```typescript
// Request
{
  repoId: number;
  sourceType: 'commit' | 'branch';
  sourceId: number;
}

// Response
{
  success: true;
  analysis: CodeAnalysisResult;
  duration: number;
}
```

### GET /api/ai/code-analysis/[id]

Fetch analysis result by ID.

## SSE Events (New)

```typescript
| { type: 'code_analysis_started'; data: { sourceType, sourceId, repoId } }
| { type: 'code_analysis_progress'; data: { stage: string, message: string } }
| { type: 'code_analysis_file'; data: { file: string, patterns: string[] } }
| { type: 'code_analysis_completed'; data: { isAgentic, confidence, summary } }
| { type: 'code_analysis_error'; data: { error: string } }
```

## UI Components

### Admin "AI İncele" Buttons

- **Commit List**: Her commit yanında "AI İncele" butonu (admin-only)
- **Branch List**: Her branch yanında "AI İncele" butonu (admin-only)

### Analysis Report Modal

- Agentic/Human badge with confidence %
- Summary card
- Stats grid (files, additions, deletions)
- Patterns found badges
- File breakdown accordion
- Reasoning section

### Real-time Progress Modal

- Progress bar
- Current stage text
- Pattern badges (animate as found)

## Sync Integration

```typescript
// In sync loop - after keyword check fails:

if (detector.canUseLLM() && commit.date >= AI_CUTOFF_DATE) {
  eventEmitter.emit({
    type: 'code_analysis_started',
    data: { sourceType: 'commit', sourceId: dbCommit.id }
  });

  const analysis = await codeAnalyzer.analyzeCommit(repo.id, commit.sha, provider);

  await saveCodeAnalysis(repo.id, 'commit', dbCommit.id, analysis);
  await updateCommitAIDetection(dbCommit.id, analysis.isAgentic, analysis.confidence);

  eventEmitter.emit({
    type: 'code_analysis_completed',
    data: { isAgentic: analysis.isAgentic, confidence: analysis.confidence }
  });
}
```

## Implementation Order

| # | Task | Files |
|---|------|-------|
| 1 | DB migration | `src/lib/db.ts` |
| 2 | Smart-filter utility | `src/lib/smart-filter.ts` |
| 3 | Git provider diff methods | `src/lib/git/*.ts` |
| 4 | Code Analyzer core | `src/lib/code-analyzer.ts` |
| 5 | Admin test API | `src/app/api/ai/code-analysis/*.ts` |
| 6 | SSE events (new types) | `src/app/api/events/route.ts` |
| 7 | Sync integration | `src/app/api/sync/route.ts` |
| 8 | UI: Analyze buttons | `src/components/dashboard/*.tsx` |
| 9 | UI: Report modal | `src/components/ai-analysis-report-modal.tsx` |
| 10 | UI: Progress modal | `src/components/ai-analysis-progress-modal.tsx` |

## Testing Strategy

1. **Unit**: Smart-filter rules, pattern detection
2. **Integration**: Git provider diff fetch, LLM API call
3. **E2E**: Full analysis flow with real commit
