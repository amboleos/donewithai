# AI Job Tracking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a quarterly bonus tracking system that awards "AI jobs" (points) for AI-assisted development work, with 200 lines changed = 1 point, real-time sync progress, admin-manageable keywords, and multi-stage AI detection.

**Architecture:** Multi-stage AI detection (keyword → LLM fallback) with queue-based async processing, SQLite row-level locking for concurrency control, Server-Sent Events for real-time progress updates, and quarterly period-based job tracking.

**Tech Stack:** Next.js 16 (App Router), Turso (libsql), Anthropic Claude API, Server-Sent Events, shadcn/ui components

---

## File Structure

### New Files
- `src/lib/ai-jobs.ts` - AI job creation, period calculation, user resolution
- `src/lib/ai-queue.ts` - Queue processor with LLM integration and retry logic
- `src/lib/ai-keywords.ts` - Keyword matching and CRUD operations
- `src/app/api/admin/keywords/route.ts` - Keywords API endpoints
- `src/app/api/ai/process-queue/route.ts` - Queue worker endpoint
- `src/app/api/ai/jobs/route.ts` - Jobs report API
- `src/app/api/events/route.ts` - SSE endpoint for real-time updates
- `src/components/admin/keywords-tab.tsx` - Admin keywords management UI
- `src/components/admin/jobs-tab.tsx` - Admin AI jobs report UI
- `src/components/sync-progress.tsx` - Global sync progress bar
- `src/contexts/sync-context.tsx` - SSE connection and progress state

### Modified Files
- `src/lib/db.ts` - Add new table schemas and AI job operations
- `src/app/api/sync/route.ts` - Integrate keyword detection and queue
- `src/app/api/ai-toggle/route.ts` - Add branch aggregation logic
- `src/components/admin/admin-tabs.tsx` - Add new tabs
- `src/app/layout.tsx` - Add SSE provider wrapper
- `src/lib/auth.ts` - Add session helper for SSE

---

## Task 1: Database Schema Extension

**Files:**
- Modify: `src/lib/db.ts`

Add new tables and indexes for AI job tracking.

- [ ] **Step 1: Add TypeScript interfaces for new tables**

Add to `src/lib/db.ts` after the `UserMapping` interface:

```typescript
export interface AIJob {
  id: number;
  repo_id: number;
  user_id: number | null;  // null = unmapped author
  period: string;  // '2025-Q1', '2025-Q2', etc.
  source_type: 'commit' | 'branch';
  source_id: number;  // commit.id or branch.id
  points: number;
  detection_method: 'keyword' | 'llm' | 'manual';
  period_date: string;  // The date used for period calculation
  created_at: string;
}

export interface AIDetectionQueue {
  id: number;
  repo_id: number;
  commit_id: number | null;
  branch_id: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface AIKeyword {
  id: number;
  keyword: string;
  is_active: number;  // 0 or 1
  created_at: string;
}
```

- [ ] **Step 2: Add table creation to initDb()**

Add to the `initDb()` function in `src/lib/db.ts`, after the `ai_detections` table creation:

```typescript
await client.execute(`
  CREATE TABLE IF NOT EXISTS ai_detection_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_id INTEGER,
    branch_id INTEGER,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT,
    error TEXT,
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS ai_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    user_id INTEGER,
    period TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    detection_method TEXT NOT NULL,
    period_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_id, source_type, source_id),
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS ai_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default keywords
await client.execute(`
  INSERT OR IGNORE INTO ai_keywords (keyword) VALUES
    ('auto-claude'), ('copilot'), ('ai-generated'), ('gpt'), ('llm'),
    ('claude'), ('chatgpt'), ('gemini'), ('openai'), ('ai assist'),
    ('ai assisted')
`);
```

- [ ] **Step 3: Add indexes**

Add to `initDb()` after the existing indexes:

```typescript
// AI job tracking indexes
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_detection_queue(status, retry_count)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_queue_repo ON ai_detection_queue(repo_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_period ON ai_jobs(period)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_jobs(user_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_repo ON ai_jobs(repo_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_repo_period ON ai_jobs(user_id, repo_id, period)`);
```

- [ ] **Step 4: Add AI job CRUD operations**

Add to `src/lib/db.ts` after the user mapping operations:

```typescript
// AI Job operations
export async function createAIJob(
  repoId: number,
  userId: number | null,
  period: string,
  sourceType: 'commit' | 'branch',
  sourceId: number,
  points: number,
  detectionMethod: 'keyword' | 'llm' | 'manual',
  periodDate: string
) {
  const result = await client.execute({
    sql: `
      INSERT INTO ai_jobs (repo_id, user_id, period, source_type, source_id, points, detection_method, period_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (repo_id, source_type, source_id) DO UPDATE SET
        user_id = excluded.user_id,
        points = excluded.points,
        detection_method = excluded.detection_method
      RETURNING *
    `,
    args: [repoId, userId, period, sourceType, sourceId, points, detectionMethod, periodDate],
  });
  return result.rows[0] as unknown as AIJob;
}

export async function getAIJobs(filters: { repoId?: number; period?: string; userId?: number } = {}) {
  let sql = `SELECT aj.*, r.name as repo_name, u.name as user_name FROM ai_jobs aj LEFT JOIN repos r ON aj.repo_id = r.id LEFT JOIN users u ON aj.user_id = u.id WHERE 1=1`;
  const args: any[] = [];

  if (filters.repoId) {
    sql += ` AND aj.repo_id = ?`;
    args.push(filters.repoId);
  }
  if (filters.period) {
    sql += ` AND aj.period = ?`;
    args.push(filters.period);
  }
  if (filters.userId) {
    sql += ` AND aj.user_id = ?`;
    args.push(filters.userId);
  }

  sql += ` ORDER BY aj.created_at DESC`;
  const result = await client.execute({ sql, args });
  return result.rows as unknown as (AIJob & { repo_name: string; user_name: string | null })[];
}

export async function getAIJobsReport(period: string) {
  // Period summary
  const summaryResult = await client.execute({
    sql: `
      SELECT
        COUNT(*) as total_jobs,
        SUM(points) as total_points,
        COUNT(DISTINCT user_id) as total_developers
      FROM ai_jobs
      WHERE period = ?
    `,
    args: [period],
  });

  // Top contributor
  const topResult = await client.execute({
    sql: `
      SELECT u.name, SUM(aj.points) as total_points
      FROM ai_jobs aj
      JOIN users u ON aj.user_id = u.id
      WHERE aj.period = ?
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 1
    `,
    args: [period],
  });

  // By developer breakdown
  const byDeveloperResult = await client.execute({
    sql: `
      SELECT
        u.id as user_id,
        u.name as user_name,
        COUNT(*) as total_jobs,
        SUM(aj.points) as total_points
      FROM ai_jobs aj
      JOIN users u ON aj.user_id = u.id
      WHERE aj.period = ?
      GROUP BY u.id
      ORDER BY total_points DESC
    `,
    args: [period],
  });

  return {
    summary: summaryResult.rows[0] as any,
    topContributor: topResult.rows[0] as any,
    byDeveloper: byDeveloperResult.rows,
  };
}

// AI Queue operations
export async function enqueueForAIDetection(
  repoId: number,
  commitId: number | null,
  branchId: number | null
) {
  const result = await client.execute({
    sql: `
      INSERT INTO ai_detection_queue (repo_id, commit_id, branch_id)
      VALUES (?, ?, ?)
      RETURNING *
    `,
    args: [repoId, commitId, branchId],
  });
  return result.rows[0] as unknown as AIDetectionQueue;
}

export async function acquireQueueItem(itemId: number): Promise<AIDetectionQueue | null> {
  const result = await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'processing', started_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
      RETURNING *
    `,
    args: [itemId],
  });
  return result.rows[0] as unknown as AIDetectionQueue | null;
}

export async function markQueueCompleted(itemId: number) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [itemId],
  });
}

export async function markQueueFailed(itemId: number, error: string) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = ?
      WHERE id = ?
    `,
    args: [error, itemId],
  });
}

export async function incrementQueueRetry(itemId: number) {
  await client.execute({
    sql: `
      UPDATE ai_detection_queue
      SET retry_count = retry_count + 1, status = 'pending'
      WHERE id = ?
    `,
    args: [itemId],
  });
}

export async function getPendingQueueItems(limit: number = 10) {
  const result = await client.execute({
    sql: `
      SELECT q.*, c.message, c.author, c.sha, b.name as branch_name
      FROM ai_detection_queue q
      LEFT JOIN commits c ON q.commit_id = c.id
      LEFT JOIN branches b ON q.branch_id = b.id
      WHERE q.status = 'pending'
      ORDER BY q.created_at ASC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows;
}

export async function cleanupOldQueueItems() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await client.execute({
    sql: `
      DELETE FROM ai_detection_queue
      WHERE status IN ('completed', 'failed') AND completed_at < ?
    `,
    args: [sevenDaysAgo],
  });
}

// AI Keyword operations
export async function getAIKeywords() {
  const result = await client.execute({
    sql: `SELECT * FROM ai_keywords ORDER BY created_at DESC`,
  });
  return result.rows as unknown as AIKeyword[];
}

export async function createAIKeyword(keyword: string) {
  const result = await client.execute({
    sql: `INSERT INTO ai_keywords (keyword) VALUES (?) RETURNING *`,
    args: [keyword.toLowerCase()],
  });
  return result.rows[0] as unknown as AIKeyword;
}

export async function deleteAIKeyword(id: number) {
  await client.execute({
    sql: `DELETE FROM ai_keywords WHERE id = ?`,
    args: [id],
  });
}

export async function toggleAIKeyword(id: number, isActive: boolean) {
  await client.execute({
    sql: `UPDATE ai_keywords SET is_active = ? WHERE id = ?`,
    args: [isActive ? 1 : 0, id],
  });
}

// Helper functions for AI job and queue management
export async function hasExistingJob(sourceType: 'commit' | 'branch', sourceId: number): Promise<boolean> {
  const result = await client.execute({
    sql: `SELECT 1 FROM ai_jobs WHERE source_type = ? AND source_id = ? LIMIT 1`,
    args: [sourceType, sourceId],
  });
  return result.rows.length > 0;
}

export async function deleteQueueItemsForSource(sourceType: 'commit' | 'branch', sourceId: number) {
  if (sourceType === 'commit') {
    await client.execute({
      sql: `DELETE FROM ai_detection_queue WHERE commit_id = ?`,
      args: [sourceId],
    });
  } else {
    await client.execute({
      sql: `DELETE FROM ai_detection_queue WHERE branch_id = ?`,
      args: [sourceId],
    });
  }
}

export async function getBranchById(branchId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM branches WHERE id = ?`,
    args: [branchId],
  });
  return result.rows[0] as unknown as Branch | undefined;
}

export async function getCommitById(commitId: number) {
  const result = await client.execute({
    sql: `SELECT * FROM commits WHERE id = ?`,
    args: [commitId],
  });
  return result.rows[0] as unknown as Commit | undefined;
}

// Note: commits-to-branch relationship requires schema addition
// See Task 1.5 for branch_commits junction table
```

- [ ] **Step 5: Test database changes**

Run: `curl -X GET "http://localhost:3000/api/init-db?force=true"`
Expected: Database initialized successfully response

- [ ] **Step 6: Add branch_commits junction table for commit-to-branch relationship**

Add to `initDb()` after the `ai_keywords` table creation:

```typescript
// Junction table to track which commits belong to which branches
// This is needed for branch aggregation AI job calculation
await client.execute(`
  CREATE TABLE IF NOT EXISTS branch_commits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    commit_id INTEGER NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, commit_id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE
  )
`);

await client.execute(`CREATE INDEX IF NOT EXISTS idx_branch_commits_branch ON branch_commits(branch_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_branch_commits_commit ON branch_commits(commit_id)`);
```

Add helper functions to `db.ts`:

```typescript
export async function linkCommitToBranch(branchId: number, commitId: number) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO branch_commits (branch_id, commit_id) VALUES (?, ?)`,
    args: [branchId, commitId],
  });
}

export async function getCommitsByBranchId(branchId: number): Promise<Commit[]> {
  const result = await client.execute({
    sql: `
      SELECT c.* FROM commits c
      JOIN branch_commits bc ON c.id = bc.commit_id
      WHERE bc.branch_id = ?
      ORDER BY c.date DESC
    `,
    args: [branchId],
  });
  return result.rows as unknown as Commit[];
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add ai_jobs, ai_detection_queue, ai_keywords, branch_commits tables"
```

---

## Task 2: AI Jobs Library

**Files:**
- Create: `src/lib/ai-jobs.ts`

Core business logic for period calculation, user resolution, and job creation.

- [ ] **Step 1: Write period calculation tests**

```typescript
// src/lib/ai-jobs.test.ts (for reference, not a real file yet)
describe('getPeriod', () => {
  it('returns Q1 for Jan-Mar', () => {
    expect(getPeriod(new Date('2025-01-15'))).toBe('2025-Q1');
    expect(getPeriod(new Date('2025-03-31'))).toBe('2025-Q1');
  });
  it('returns Q2 for Apr-Jun', () => {
    expect(getPeriod(new Date('2025-04-01'))).toBe('2025-Q2');
    expect(getPeriod(new Date('2025-06-30'))).toBe('2025-Q2');
  });
  it('returns Q3 for Jul-Sep', () => {
    expect(getPeriod(new Date('2025-07-01'))).toBe('2025-Q3');
    expect(getPeriod(new Date('2025-09-30'))).toBe('2025-Q3');
  });
  it('returns Q4 for Oct-Dec', () => {
    expect(getPeriod(new Date('2025-10-01'))).toBe('2025-Q4');
    expect(getPeriod(new Date('2025-12-31'))).toBe('2025-Q4');
  });
});
```

- [ ] **Step 2: Create ai-jobs.ts with period calculation**

```typescript
// src/lib/ai-jobs.ts
import { client, createAIJob, getMappingsByRepo, type Commit, type Branch } from '@/lib/db';

/**
 * Calculate quarterly period from a date
 * Q1: Jan-Mar (months 0-2), Q2: Apr-Jun (3-5), Q3: Jul-Sep (6-8), Q4: Oct-Dec (9-11)
 */
export function getPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  if (month < 3) return `${year}-Q1`;  // Jan 1 - Mar 31
  if (month < 6) return `${year}-Q2`;  // Apr 1 - Jun 30
  if (month < 9) return `${year}-Q3`;  // Jul 1 - Sep 30
  return `${year}-Q4`;                 // Oct 1 - Dec 31
}

/**
 * Calculate points from lines changed
 * 200 lines = 1 point, rounded down
 */
export function calculatePoints(linesAdded: number, linesRemoved: number): number {
  return Math.floor((linesAdded + linesRemoved) / 200);
}

/**
 * Resolve GitHub username to internal user_id via user_mappings
 * Returns null if no mapping exists (unassigned job)
 */
export async function resolveUserId(repoId: number, githubAuthor: string): Promise<number | null> {
  const mappings = await getMappingsByRepo(repoId);
  const mapping = mappings.find(
    m => m.github_username.toLowerCase() === githubAuthor.toLowerCase()
  );
  return mapping?.user_id ?? null;
}

/**
 * Create an AI job from a commit
 */
export async function createAIJobFromCommit(
  commit: Commit,
  detectionMethod: 'keyword' | 'llm' | 'manual'
) {
  const points = calculatePoints(commit.lines_added, commit.lines_removed);
  if (points < 1) return null;

  const commitDate = new Date(commit.date);
  const userId = await resolveUserId(commit.repo_id, commit.author);

  return createAIJob(
    commit.repo_id,
    userId,
    getPeriod(commitDate),
    'commit',
    commit.id,
    points,
    detectionMethod,
    commitDate.toISOString()
  );
}

/**
 * Create an AI job from a branch (aggregates all commits in the branch)
 */
export async function createAIJobFromBranch(
  repoId: number,
  branch: Branch,
  allBranchCommits: Commit[],
  detectionMethod: 'manual'
) {
  // Aggregate lines from all commits in this branch
  const totalLinesAdded = allBranchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
  const totalLinesRemoved = allBranchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);

  const points = calculatePoints(totalLinesAdded, totalLinesRemoved);
  if (points < 1) return null;

  // Use branch creation date for period calculation
  const branchDate = new Date(branch.created_at);
  const userId = await resolveUserId(repoId, branch.created_by);

  return createAIJob(
    repoId,
    userId,
    getPeriod(branchDate),
    'branch',
    branch.id,
    points,
    detectionMethod,
    branchDate.toISOString()
  );
}

// Note: hasExistingJob is now in db.ts to avoid circular dependencies
// Import it from '@/lib/db' when needed
```

- [ ] **Step 3: Test period calculation manually**

Create a test file `src/lib/__tests__/ai-jobs.test.ts`:

```typescript
import { getPeriod, calculatePoints } from '../ai-jobs';

describe('AI Jobs', () => {
  describe('getPeriod', () => {
    test('Q1 dates', () => {
      expect(getPeriod(new Date('2025-01-15'))).toBe('2025-Q1');
      expect(getPeriod(new Date('2025-02-28'))).toBe('2025-Q1');
      expect(getPeriod(new Date('2025-03-31'))).toBe('2025-Q1');
    });
    test('Q2 dates', () => {
      expect(getPeriod(new Date('2025-04-01'))).toBe('2025-Q2');
      expect(getPeriod(new Date('2025-05-15'))).toBe('2025-Q2');
      expect(getPeriod(new Date('2025-06-30'))).toBe('2025-Q2');
    });
    test('Q3 dates', () => {
      expect(getPeriod(new Date('2025-07-01'))).toBe('2025-Q3');
      expect(getPeriod(new Date('2025-08-15'))).toBe('2025-Q3');
      expect(getPeriod(new Date('2025-09-30'))).toBe('2025-Q3');
    });
    test('Q4 dates', () => {
      expect(getPeriod(new Date('2025-10-01'))).toBe('2025-Q4');
      expect(getPeriod(new Date('2025-11-15'))).toBe('2025-Q4');
      expect(getPeriod(new Date('2025-12-31'))).toBe('2025-Q4');
    });
  });

  describe('calculatePoints', () => {
    test('rounds down correctly', () => {
      expect(calculatePoints(615, 0)).toBe(3);  // 615 / 200 = 3.075 → 3
      expect(calculatePoints(199, 0)).toBe(0);  // Below threshold
      expect(calculatePoints(200, 0)).toBe(1);  // Exactly threshold
      expect(calculatePoints(100, 100)).toBe(1); // Combined
    });
  });
});
```

Run: `npm test -- ai-jobs` (if Jest is configured) or verify manually

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai-jobs.ts
git commit -m "feat: add ai-jobs business logic (period calc, user resolution, points)"
```

---

## Task 3: AI Keywords Library

**Files:**
- Create: `src/lib/ai-keywords.ts`

Keyword matching for fast-path AI detection.

- [ ] **Step 1: Create ai-keywords.ts**

```typescript
// src/lib/ai-keywords.ts
import { getAIKeywords, type AIKeyword } from '@/lib/db';

let keywordsCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get active keywords (with caching)
 */
export async function getActiveKeywords(): Promise<string[]> {
  const now = Date.now();

  if (keywordsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return keywordsCache;
  }

  const allKeywords = await getAIKeywords();
  keywordsCache = allKeywords
    .filter((k: AIKeyword) => k.is_active === 1)
    .map((k: AIKeyword) => k.keyword.toLowerCase());

  cacheTimestamp = now;
  return keywordsCache;
}

/**
 * Check if text contains any AI keyword
 */
export async function hasAIKeyword(text: string): Promise<boolean> {
  const keywords = await getActiveKeywords();
  const lowerText = text.toLowerCase();

  return keywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Invalidate keyword cache (call after CRUD operations)
 */
export function invalidateKeywordCache() {
  keywordsCache = null;
  cacheTimestamp = 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai-keywords.ts
git commit -m "feat: add ai-keywords library with caching"
```

---

## Task 4: Keywords API

**Files:**
- Create: `src/app/api/admin/keywords/route.ts`

Admin API for managing AI keywords.

- [ ] **Step 1: Create keywords API route**

```typescript
// src/app/api/admin/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { getAIKeywords, createAIKeyword, deleteAIKeyword, toggleAIKeyword } from '@/lib/db';
import { invalidateKeywordCache } from '@/lib/ai-keywords';

// GET - List all keywords
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keywords = await getAIKeywords();
  return NextResponse.json({ keywords });
}

// POST - Add new keyword
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keyword } = await req.json();

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const trimmed = keyword.trim().toLowerCase();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: 'Keyword must be at least 2 characters' }, { status: 400 });
    }

    const newKeyword = await createAIKeyword(trimmed);
    invalidateKeywordCache();

    return NextResponse.json({ keyword: newKeyword });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Keyword already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove keyword
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await deleteAIKeyword(id);
    invalidateKeywordCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Toggle keyword active status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, isActive } = await req.json();

    if (typeof id !== 'number' || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await toggleAIKeyword(id, isActive);
    invalidateKeywordCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test keywords API**

Run tests:
```bash
# Add keyword
curl -X POST http://localhost:3000/api/admin/keywords \
  -H "Content-Type: application/json" \
  -d '{"keyword":"test-ai"}' \
  --cookie "session=YOUR_SESSION_COOKIE"

# List keywords
curl http://localhost:3000/api/admin/keywords --cookie "session=YOUR_SESSION_COOKIE"
```

Expected: Keyword created and listed

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/keywords/route.ts
git commit -m "feat: add admin keywords API (GET/POST/DELETE/PATCH)"
```

---

## Task 5: Queue Processor Library

**Files:**
- Create: `src/lib/ai-queue.ts`

Background queue processing with LLM integration and retry logic.

- [ ] **Step 1: Create ai-queue.ts**

```typescript
// src/lib/ai-queue.ts
import Anthropic from '@anthropic-ai/sdk';
import {
  enqueueForAIDetection,
  acquireQueueItem,
  markQueueCompleted,
  markQueueFailed,
  incrementQueueRetry,
  getPendingQueueItems,
  createAIJob,
  getCommitsByRepo,
  cleanupOldQueueItems
} from '@/lib/db';
import { getPeriod, calculatePoints, resolveUserId } from './ai-jobs';
import type { AIDetectionQueue, Commit } from '@/lib/db';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

export class AIQueueProcessor {
  private anthropic: Anthropic | null = null;
  private isProcessing = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Process multiple queue items with 1-second delay between LLM calls
   */
  async processBatch(items: Array<AIDetectionQueue & { message?: string; author?: string; sha?: string }>): Promise<number> {
    let processed = 0;

    for (const item of items) {
      const success = await this.processItem(item);
      if (success) {
        processed++;
      }

      // 1-second delay between LLM requests (rate limiting per spec)
      if (processed < items.length) {
        await this.sleep(1000);
      }
    }

    return processed;
  }

  /**
   * Process a single queue item with LLM detection
   */
  async processItem(item: AIDetectionQueue & { message?: string; branch_name?: string; author?: string; sha?: string }): Promise<boolean> {
    // Acquire lock
    const locked = await acquireQueueItem(item.id);
    if (!locked) {
      console.log(`[Queue] Item ${item.id} already being processed`);
      return false;
    }

    try {
      // Determine text for LLM detection
      const text = item.commit_id ? (item.message || '') : (item.branch_name || '');
      const type = item.commit_id ? 'commit' : 'branch';

      const isAI = await this.detectWithLLM(text, type);

      if (!isAI) {
        await markQueueCompleted(item.id);
        console.log(`[Queue] Item ${item.id} not AI, skipped`);
        return true;
      }

      // Create AI job
      if (item.commit_id) {
        await this.createJobForCommit(item.commit_id, item.repo_id);
      } else if (item.branch_id) {
        await this.createJobForBranch(item.branch_id, item.repo_id);
      }

      await markQueueCompleted(item.id);
      console.log(`[Queue] Item ${item.id} completed, AI job created`);
      return true;

    } catch (error: any) {
      console.error(`[Queue] Item ${item.id} failed:`, error.message);

      if (item.retry_count < MAX_RETRIES) {
        await incrementQueueRetry(item.id);
        await this.sleep(RETRY_DELAYS[item.retry_count]);
        // Re-queue by returning false
        return false;
      } else {
        await markQueueFailed(item.id, error.message);
        return true;
      }
    }
  }

  /**
   * Detect AI using LLM API
   */
  private async detectWithLLM(text: string, type: 'commit' | 'branch'): Promise<boolean> {
    if (!this.anthropic) {
      // No API key, use conservative default (not AI)
      return false;
    }

    const prompt = type === 'commit'
      ? `Analyze this commit message and determine if it was AI-generated or written by a human. Reply with JSON: {"isAI": boolean}. Commit: "${text}"`
      : `Analyze this branch name and determine if it was AI-generated or created by a human. Reply with JSON: {"isAI": boolean}. Branch: "${text}"`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const match = content.text.match(/\{[^}]+\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return parsed.isAI === true;
        }
      }
    } catch (error) {
      console.error('[Queue] LLM API call failed:', error);
    }

    return false;
  }

  /**
   * Create AI job for commit
   */
  private async createJobForCommit(commitId: number, repoId: number) {
    const commits = await getCommitsByRepo(repoId, 10000);
    const commit = commits.find(c => c.id === commitId);
    if (!commit) return;

    const points = calculatePoints(commit.lines_added, commit.lines_removed);
    if (points < 1) return;

    const commitDate = new Date(commit.date);
    const userId = await resolveUserId(repoId, commit.author);

    await createAIJob(
      repoId,
      userId,
      getPeriod(commitDate),
      'commit',
      commitId,
      points,
      'llm',
      commitDate.toISOString()
    );
  }

  /**
   * Create AI job for branch (aggregates all commits)
   */
  private async createJobForBranch(branchId: number, repoId: number) {
    // Use the branch_commits junction table to get all commits for this branch
    const branchCommits = await getCommitsByBranchId(branchId);

    if (branchCommits.length === 0) return;

    const totalLinesAdded = branchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
    const totalLinesRemoved = branchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
    const points = calculatePoints(totalLinesAdded, totalLinesRemoved);

    if (points < 1) return;

    const userId = await resolveUserId(repoId, branchCommits[0].author);

    await createAIJob(
      repoId,
      userId,
      getPeriod(new Date()),
      'branch',
      branchId,
      points,
      'llm',
      new Date().toISOString()
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old queue items
   */
  async cleanup() {
    await cleanupOldQueueItems();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai-queue.ts
git commit -m "feat: add AI queue processor with LLM integration"
```

---

## Task 6: Queue Process API

**Files:**
- Create: `src/app/api/ai/process-queue/route.ts`

Endpoint that processes queued items (called by sync or manually).

- [ ] **Step 1: Create queue process endpoint**

```typescript
// src/app/api/ai/process-queue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES } from '@/lib/db';
import { AIQueueProcessor } from '@/lib/ai-queue';
import { getPendingQueueItems } from '@/lib/db';

const processor = new AIQueueProcessor();
let isProcessing = false;

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isProcessing) {
    return NextResponse.json({ message: 'Queue already being processed' }, { status: 409 });
  }

  isProcessing = true;

  try {
    const items = await getPendingQueueItems(10);
    const processed = await processor.processBatch(items as any);

    return NextResponse.json({ processed, total: items.length });
  } finally {
    isProcessing = false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/process-queue/route.ts
git commit -m "feat: add queue processing endpoint"
```

---

## Task 7: SSE Events Endpoint

**Files:**
- Create: `src/app/api/events/route.ts`

Server-Sent Events for real-time sync progress.

- [ ] **Step 1: Create SSE endpoint**

```typescript
// src/app/api/events/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SSE event type definitions
export type SyncEvent =
  | { type: 'sync_started'; data: { repoId: number; repoName: string; totalCommits: number; timestamp: string } }
  | { type: 'progress'; data: { repoId: number; processed: number; total: number; percentage: number; currentCommit: string } }
  | { type: 'sync_completed'; data: { repoId: number; aiJobsFound: number; duration: number } }
  | { type: 'ai_tagged'; data: { type: 'commit' | 'branch'; id: number; userName: string } };

// Global event emitter for SSE
class EventEmitter {
  private controllers: Set<ReadableStreamDefaultController> = new Set();

  addController(controller: ReadableStreamDefaultController) {
    this.controllers.add(controller);
    return () => this.controllers.delete(controller);
  }

  emit(event: SyncEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const controller of this.controllers) {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch (e) {
        this.controllers.delete(controller);
      }
    }
  }
}

export const eventEmitter = new EventEmitter();

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const remove = eventEmitter.addController(controller);

      // Send initial connection message
      controller.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));

      // Keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
        } catch (e) {
          clearInterval(keepAlive);
          remove();
        }
      }, 30000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        remove();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Test SSE connection**

```bash
curl -N http://localhost:3000/api/events --cookie "session=YOUR_SESSION_COOKIE"
```

Expected: `data: {"type":"connected"}` followed by keep-alive comments

- [ ] **Step 3: Commit**

```bash
git add src/app/api/events/route.ts
git commit -m "feat: add SSE events endpoint for real-time updates"
```

---

## Task 8: Sync Integration

**Files:**
- Modify: `src/app/api/sync/route.ts`

Integrate keyword detection, queue, and SSE events.

- [ ] **Step 1: Update sync route**

Replace the existing sync logic with this updated version:

```typescript
// src/app/api/sync/route.ts (partial replacement of existing file)
import { NextRequest, NextResponse } from 'next/server';
import {
  getRepos,
  createRepo,
  upsertCommit,
  upsertBranch,
  updateRepoLastSynced,
  updateRepoError,
  getPendingCommitsForDiffstat,
  updateCommitLines,
  updateCommitAIDetection,
  updateBranchAIDetection,
  enqueueForAIDetection,
  hasExistingJob,
} from '@/lib/db';
import { createProvider, parseRepoUrl, getEnvVarName, type GitProvider } from '@/lib/git';
import { AIDetector } from '@/lib/ai-detector';
import { hasAIKeyword } from '@/lib/ai-keywords';
import { createAIJobFromCommit, getPeriod } from '@/lib/ai-jobs';
import { eventEmitter } from '../events/route';
import type { GitProviderType } from '@/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Parse URL to detect provider
    let parsed;
    try {
      parsed = parseRepoUrl(url);
    } catch (e) {
      return NextResponse.json(
        { error: 'Unsupported git provider. Use GitHub or Bitbucket URL' },
        { status: 400 }
      );
    }

    const provider = createProvider(url);
    const detector = new AIDetector(process.env.ANTHROPIC_API_KEY);

    // Get repo info
    const repoInfo = await provider.getRepoInfo(url);

    // Determine token env var
    const tokenEnvVar = getEnvVarName(parsed.name, parsed.provider);

    // Create or get repo
    const existingRepos = await getRepos();
    let repo = existingRepos.find((r) => r.url === url);

    if (!repo) {
      repo = await createRepo(
        repoInfo.name,
        url,
        repoInfo.owner,
        parsed.provider,
        tokenEnvVar
      );
    }

    // Clear any previous sync error
    await updateRepoError(repo.id, null);

    // Emit sync started
    eventEmitter.emit({
      type: 'sync_started',
      data: {
        repoId: repo.id,
        repoName: repo.name,
        totalCommits: 0, // Will update after fetch
        timestamp: new Date().toISOString(),
      },
    });

    // Fetch commits
    console.log('[SYNC] Starting fetch commits...', repo.last_synced ? 'since: ' + repo.last_synced : 'full sync');
    const lastSyncDate = repo.last_synced ? new Date(repo.last_synced) : undefined;
    const commits = await provider.getCommits(url, lastSyncDate);
    console.log('[SYNC] Fetched', commits.length, 'commits');

    // Update sync_started with actual count
    eventEmitter.emit({
      type: 'sync_started',
      data: {
        repoId: repo.id,
        repoName: repo.name,
        totalCommits: commits.length,
        timestamp: new Date().toISOString(),
      },
    });

    let aiJobsCreated = 0;
    let processedCount = 0;

    for (const commit of commits) {
      const dbCommit = await upsertCommit(
        repo.id,
        commit.sha,
        commit.message,
        commit.author,
        commit.authorEmail,
        commit.date,
        commit.additions,
        commit.deletions
      );
      processedCount++;

      // Emit progress
      if (processedCount % 10 === 0 || processedCount === commits.length) {
        eventEmitter.emit({
          type: 'progress',
          data: {
            repoId: repo.id,
            processed: processedCount,
            total: commits.length,
            percentage: Math.round((processedCount / commits.length) * 100),
            currentCommit: commit.message.split('\n')[0].substring(0, 50),
          },
        });
      }

      // Skip if AI job already exists
      if (await hasExistingJob('commit', dbCommit.id)) {
        continue;
      }

      // Check for AI keyword
      const hasKeyword = await hasAIKeyword(commit.message);

      if (hasKeyword && (commit.additions + commit.deletions) >= 200) {
        const job = await createAIJobFromCommit(dbCommit, 'keyword');
        if (job) {
          aiJobsCreated++;
          eventEmitter.emit({
            type: 'ai_tagged',
            data: {
              type: 'commit',
              id: dbCommit.id,
              userName: commit.author,
            },
          });
        }
      } else {
        // Add to queue for LLM processing
        await enqueueForAIDetection(repo.id, dbCommit.id, null);
      }
    }

    console.log('[SYNC] Finished processing', commits.length, 'commits, created', aiJobsCreated, 'AI jobs');

    // Fetch branches
    const branches = await provider.getBranches(url);
    for (const branch of branches) {
      const dbBranch = await upsertBranch(
        repo.id,
        branch.name,
        'unknown',
        new Date()
      );

      if (dbBranch.is_ai_detected === null) {
        const detection = detector.detectFromBranchName(branch.name);
        if (detection.confidence > 0.5) {
          await updateBranchAIDetection(dbBranch.id, detection.isAI);
        }
      }
    }

    await updateRepoLastSynced(repo.id);

    // Emit sync completed
    const duration = Date.now() - startTime;
    eventEmitter.emit({
      type: 'sync_completed',
      data: {
        repoId: repo.id,
        aiJobsFound: aiJobsCreated,
        duration,
      },
    });

    // For Bitbucket, trigger background diffstat fetch
    if (parsed.provider === 'bitbucket' && typeof provider.getCommitDiffstat === 'function') {
      fetchDiffstatInBackground(repo.id, url, provider).catch(err => {
        console.error('Background diffstat fetch error:', err);
      });
    }

    return NextResponse.json({ success: true, repo, aiJobsCreated });
  } catch (error: any) {
    console.error('Sync error:', error);

    if (error.message?.includes('Environment variable')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Keep existing fetchDiffstatInBackground function
async function fetchDiffstatInBackground(
  repoId: number,
  url: string,
  provider: GitProvider
) {
  const pendingCommits = await getPendingCommitsForDiffstat(repoId);

  for (const commit of pendingCommits) {
    try {
      const diffstat = await provider.getCommitDiffstat(url, commit.sha);
      await updateCommitLines(repoId, commit.sha, diffstat.additions, diffstat.deletions);
      await new Promise(resolve => setTimeout(resolve, 4000));
    } catch (error) {
      console.error(`Failed to fetch diffstat for ${commit.sha}:`, error);
      await updateRepoError(
        repoId,
        `Failed to fetch diffstat for ${commit.sha.substring(0, 8)}`
      );
    }
  }

  await updateRepoError(repoId, null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sync/route.ts
git commit -m "feat: integrate keyword detection, queue, and SSE events into sync"
```

---

## Task 9: AI Toggle Update for Branches

**Files:**
- Modify: `src/app/api/ai-toggle/route.ts`

Add branch aggregation logic when manually tagging, with queue cleanup.

- [ ] **Step 1: Update ai-toggle route**

```typescript
// src/app/api/ai-toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  updateCommitAIDetectionManual,
  updateBranchAIDetectionManual,
  getBranchById,
  getCommitsByBranchId,
  deleteQueueItemsForSource,
  hasExistingJob,
  createAIJob,
  getCommitById,
} from '@/lib/db';
import { getPeriod, calculatePoints, resolveUserId } from '@/lib/ai-jobs';
import { eventEmitter } from '../events/route';

export async function POST(req: NextRequest) {
  try {
    const { type, id, isAI, repoId } = await req.json();

    if (type === 'commit') {
      // Remove from queue if pending (manual toggle wins)
      await deleteQueueItemsForSource('commit', id);

      await updateCommitAIDetectionManual(id, isAI);

      // If marking as AI, create or update AI job
      if (isAI) {
        const commit = await getCommitById(id);
        if (!commit) {
          return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
        }

        const points = calculatePoints(commit.lines_added, commit.lines_removed);
        if (points >= 1) {
          const commitDate = new Date(commit.date);
          const userId = await resolveUserId(commit.repo_id, commit.author);

          // Create or update job with manual detection method
          await createAIJob(
            commit.repo_id,
            userId,
            getPeriod(commitDate),
            'commit',
            id,
            points,
            'manual',
            commitDate.toISOString()
          );
        }
      }

      eventEmitter.emit({
        type: 'ai_tagged',
        data: { type: 'commit', id, userName: 'admin' },
      });
    } else if (type === 'branch') {
      // Remove from queue if pending
      await deleteQueueItemsForSource('branch', id);

      await updateBranchAIDetectionManual(id, isAI);

      // When marking branch as AI, create aggregated job
      if (isAI) {
        const branch = await getBranchById(id);
        if (!branch) {
          return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // Get all commits linked to this branch
        const branchCommits = await getCommitsByBranchId(id);

        if (branchCommits.length > 0) {
          const totalLinesAdded = branchCommits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
          const totalLinesRemoved = branchCommits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
          const points = calculatePoints(totalLinesAdded, totalLinesRemoved);

          if (points >= 1) {
            const branchDate = new Date(branch.created_at);
            const userId = await resolveUserId(branch.repo_id, branch.created_by);

            // Check if job exists and update or create
            const existing = await hasExistingJob('branch', id);
            if (existing) {
              // Update existing job to manual detection method
              await createAIJob(
                branch.repo_id,
                userId,
                getPeriod(branchDate),
                'branch',
                id,
                points,
                'manual', // Override to manual
                branchDate.toISOString()
              );
            } else {
              await createAIJob(
                branch.repo_id,
                userId,
                getPeriod(branchDate),
                'branch',
                id,
                points,
                'manual',
                branchDate.toISOString()
              );
            }

            eventEmitter.emit({
              type: 'ai_tagged',
              data: { type: 'branch', id, userName: branch.created_by },
            });
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai-toggle/route.ts
git commit -m "feat: add branch aggregation and queue cleanup to ai-toggle"
```

---

## Task 10: AI Jobs Report API

**Files:**
- Create: `src/app/api/ai/jobs/route.ts`

API for fetching AI jobs reports with filtering.

- [ ] **Step 1: Create jobs report API**

```typescript
// src/app/api/ai/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-auth';
import { ROLES, getAIJobs, getAIJobsReport } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const repoId = searchParams.get('repoId');
  const period = searchParams.get('period');
  const userId = searchParams.get('userId');
  const report = searchParams.get('report') === 'true';

  try {
    if (report && period) {
      // Get aggregated report
      const data = await getAIJobsReport(period);
      return NextResponse.json(data);
    }

    // Get filtered job list
    const jobs = await getAIJobs({
      repoId: repoId ? parseInt(repoId) : undefined,
      period: period || undefined,
      userId: userId ? parseInt(userId) : undefined,
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/jobs/route.ts
git commit -m "feat: add ai jobs report API"
```

---

## Task 11: Keywords Admin UI

**Files:**
- Create: `src/components/admin/keywords-tab.tsx`

Admin interface for managing AI keywords.

- [ ] **Step 1: Create keywords tab component**

```typescript
// src/components/admin/keywords-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface AIKeyword {
  id: number;
  keyword: string;
  is_active: number;
  created_at: string;
}

export default function KeywordsTab() {
  const [keywords, setKeywords] = useState<AIKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keywords');
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      toast.error('Failed to load keywords');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add keyword');
      }

      await fetchKeywords();
      setNewKeyword('');
      toast.success('Keyword added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add keyword');
    }
  };

  const deleteKeyword = async (id: number) => {
    try {
      await fetch(`/api/admin/keywords?id=${id}`, { method: 'DELETE' });
      await fetchKeywords();
      toast.success('Keyword deleted');
    } catch (error) {
      toast.error('Failed to delete keyword');
    }
  };

  const toggleKeyword = async (id: number, isActive: boolean) => {
    try {
      await fetch('/api/admin/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      await fetchKeywords();
      toast.success('Keyword updated');
    } catch (error) {
      toast.error('Failed to update keyword');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Keywords</CardTitle>
        <p className="text-sm text-slate-500">
          Commits containing these keywords will be auto-flagged as AI-generated
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add new keyword (e.g., 'copilot', 'gpt')"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            className="max-w-sm"
          />
          <Button onClick={addKeyword}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {keywords.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No keywords configured</p>
          ) : (
            keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{kw.keyword}</span>
                  {kw.is_active ? (
                    <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyword(kw.id, !kw.is_active)}
                  >
                    {kw.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKeyword(kw.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/keywords-tab.tsx
git commit -m "feat: add admin keywords tab UI"
```

---

## Task 12: AI Jobs Report UI

**Files:**
- Create: `src/components/admin/jobs-tab.tsx`

Admin interface for viewing AI jobs reports.

- [ ] **Step 1: Create jobs tab component**

```typescript
// src/components/admin/jobs-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Trophy, TrendingUp } from 'lucide-react';

interface JobReport {
  summary: {
    total_jobs: number;
    total_points: number;
    total_developers: number;
  };
  topContributor: {
    name: string;
    total_points: number;
  } | null;
  byDeveloper: Array<{
    user_id: number;
    user_name: string;
    total_jobs: number;
    total_points: number;
  }>;
}

interface Job {
  id: number;
  repo_name: string;
  user_name: string | null;
  period: string;
  source_type: string;
  points: number;
  detection_method: string;
  created_at: string;
}

export default function JobsTab() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${q}`;
  });
  const [report, setReport] = useState<JobReport | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportRes, jobsRes] = await Promise.all([
        fetch(`/api/ai/jobs?period=${period}&report=true`),
        fetch(`/api/ai/jobs?period=${period}`),
      ]);

      const reportData = await reportRes.json();
      const jobsData = await jobsRes.json();

      setReport(reportData);
      setJobs(jobsData.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { label: 'Current Quarter', value: period },
    { label: 'Q1 2025', value: '2025-Q1' },
    { label: 'Q4 2024', value: '2024-Q4' },
    { label: 'Q3 2024', value: '2024-Q3' },
    { label: 'Q2 2024', value: '2024-Q2' },
  ];

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium">Period:</span>
        {periods.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{report?.summary.total_jobs || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Total Points
            </CardDescription>
            <CardTitle className="text-3xl text-purple-600">{report?.summary.total_points || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Contributor</CardDescription>
            <CardTitle className="text-xl">{report?.topContributor?.name || 'N/A'}</CardTitle>
            <p className="text-sm text-slate-500">{report?.topContributor?.total_points || 0} pts</p>
          </CardHeader>
        </Card>
      </div>

      {/* By Developer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report?.byDeveloper.map((dev, idx) => (
              <div
                key={dev.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-400">#{idx + 1}</span>
                  <span className="font-medium">{dev.user_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">{dev.total_jobs} jobs</span>
                  <Badge className="bg-purple-100 text-purple-700">{dev.total_points} pts</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{job.user_name || 'Unassigned'}</p>
                  <p className="text-sm text-slate-500">{job.repo_name} · {job.source_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{job.detection_method}</Badge>
                  <Badge className="bg-green-100 text-green-700">{job.points} pts</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/jobs-tab.tsx
git commit -m "feat: add admin jobs report tab UI"
```

---

## Task 13: Update Admin Tabs

**Files:**
- Modify: `src/components/admin/admin-tabs.tsx`

Add new tabs to admin interface.

- [ ] **Step 1: Update admin-tabs.tsx**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, GitBranch, Brain, Key, Trophy } from 'lucide-react';
import ReposTab from '@/components/admin/repos-tab';
import MappingsTab from '@/components/admin/mappings-tab';
import AIFlagsTab from '@/components/admin/ai-flags-tab';
import KeywordsTab from '@/components/admin/keywords-tab';
import JobsTab from '@/components/admin/jobs-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags' | 'keywords' | 'jobs';

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('repos');

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={activeTab === 'repos' ? 'default' : 'outline'}
          onClick={() => setActiveTab('repos')}
        >
          <Database className="h-4 w-4 mr-2" />
          Repositories
        </Button>
        <Button
          variant={activeTab === 'mappings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('mappings')}
        >
          <GitBranch className="h-4 w-4 mr-2" />
          User Mapping
        </Button>
        <Button
          variant={activeTab === 'ai-flags' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ai-flags')}
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Flags
        </Button>
        <Button
          variant={activeTab === 'keywords' ? 'default' : 'outline'}
          onClick={() => setActiveTab('keywords')}
        >
          <Key className="h-4 w-4 mr-2" />
          Keywords
        </Button>
        <Button
          variant={activeTab === 'jobs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('jobs')}
        >
          <Trophy className="h-4 w-4 mr-2" />
          Jobs Report
        </Button>
      </div>

      {activeTab === 'repos' && <ReposTab />}
      {activeTab === 'mappings' && <MappingsTab />}
      {activeTab === 'ai-flags' && <AIFlagsTab />}
      {activeTab === 'keywords' && <KeywordsTab />}
      {activeTab === 'jobs' && <JobsTab />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/admin-tabs.tsx
git commit -m "feat: add keywords and jobs tabs to admin"
```

---

## Task 14: SSE Context Provider

**Files:**
- Create: `src/contexts/sync-context.tsx`

React context for SSE connection and progress state.

- [ ] **Step 1: Create sync context**

```typescript
// src/contexts/sync-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SyncProgress {
  repoId: number;
  repoName: string;
  processed: number;
  total: number;
  percentage: number;
  currentCommit: string;
}

interface SyncContextType {
  progress: SyncProgress | null;
  isConnected: boolean;
}

const SyncContext = createContext<SyncContextType>({
  progress: null,
  isConnected: false,
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        // Reconnect after delay - check if already closed to avoid duplicates
        setTimeout(() => {
          if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            setProgress(data.data);
          } else if (data.type === 'sync_completed') {
            // Keep final progress for a few seconds, then clear
            setTimeout(() => setProgress(null), 3000);
          }
        } catch (e) {
          // Ignore parse errors for keep-alive
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, []);

  return (
    <SyncContext.Provider value={{ progress, isConnected }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncProgress() {
  return useContext(SyncContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/sync-context.tsx
git commit -m "feat: add SSE context provider for sync progress"
```

---

## Task 15: Sync Progress Component

**Files:**
- Create: `src/components/sync-progress.tsx`

Global progress bar component.

- [ ] **Step 1: Create sync progress component**

```typescript
// src/components/sync-progress.tsx
'use client';

import { useSyncProgress } from '@/contexts/sync-context';
import { BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function SyncProgress() {
  const { progress, isConnected } = useSyncProgress();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (progress && !visible) {
      setVisible(true);
    } else if (!progress && visible) {
      // Hide after completion
      const timeout = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [progress, visible]);

  if (!visible || !progress) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <span className="font-medium">{progress.repoName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              {progress.processed} / {progress.total} commits
            </span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>

          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {progress.currentCommit && (
            <p className="text-xs text-slate-500 truncate">
              {progress.currentCommit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sync-progress.tsx
git commit -m "feat: add global sync progress bar component"
```

---

## Task 16: Root Layout Integration

**Files:**
- Modify: `src/app/layout.tsx`

Add SyncProvider to app root.

- [ ] **Step 1: Update layout.tsx**

Add the provider and progress component to the root layout:

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SyncProvider, SyncProgress } from "@/contexts/sync-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DoneWithAI",
  description: "AI Code Detection Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SyncProvider>
          {children}
          <SyncProgress />
          <Toaster />
        </SyncProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add SyncProvider and SyncProgress to root layout"
```

---

## Task 17: Session Helper for SSE

**Files:**
- Create: `src/lib/server-auth.ts`

Add getServerSession helper that reuses existing simple-auth pattern.

- [ ] **Step 1: Create server-auth.ts**

```typescript
// src/lib/server-auth.ts
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/simple-auth';
import { getUserById } from '@/lib/db';

export interface ServerSession {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;

  if (!authToken) {
    return null;
  }

  const payload = verifyToken(authToken);
  if (!payload) {
    return null;
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server-auth.ts
git commit -m "feat: add getServerSession helper for SSE auth"
```

---

## Task 18: Client-side Cooldown

**Files:**
- Modify: `src/components/dashboard/repo-list.tsx` (or wherever sync button is)

Add 15-minute cooldown between syncs.

- [ ] **Step 1: Add cooldown to sync button**

Find the sync button handler and update it:

```typescript
// Add to the component that triggers sync
const [lastSync, setLastSync] = useState<number | null>(null);

useEffect(() => {
  const stored = localStorage.getItem('lastSyncTime');
  if (stored) {
    setLastSync(parseInt(stored));
  }
}, []);

const canSync = !lastSync || Date.now() - lastSync > 15 * 60 * 1000; // 15 minutes

const handleSync = async (url: string) => {
  if (!canSync) {
    const minutesLeft = Math.ceil((15 * 60 * 1000 - (Date.now() - lastSync!)) / 60000);
    toast.error(`Please wait ${minutesLeft} minutes before syncing again`);
    return;
  }

  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    localStorage.setItem('lastSyncTime', Date.now().toString());
    setLastSync(Date.now());
    toast.success('Sync started');
  } catch (error) {
    toast.error('Sync failed');
  }
};

// In the button JSX:
<Button disabled={!canSync} onClick={() => handleSync(repo.url)}>
  {canSync ? 'Sync' : 'Cooldown'}
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/repo-list.tsx
git commit -m "feat: add 15-minute cooldown to sync button"
```

---

## Task 19: End-to-End Testing

**Files:**
- None (testing existing code)

- [ ] **Step 1: Test full flow**

1. Initialize database: `curl "http://localhost:3000/api/init-db?force=true"`
2. Login as admin user
3. Add a repository via UI
4. Trigger sync - verify progress bar shows
5. Check Keywords tab - default keywords should be present
6. Add a new keyword via UI
7. Check Jobs Report tab - should show jobs if commits matched keywords
8. Manually toggle AI flag on a commit
9. Process queue via `/api/ai/process-queue`

- [ ] **Step 2: Verify database state**

```bash
# Check tables were created
curl "http://localhost:3000/api/admin/keywords"
curl "http://localhost:3000/api/ai/jobs?period=2025-Q1"
```

- [ ] **Step 3: Create final commit**

```bash
git add .
git commit -m "feat: complete AI job tracking system implementation"
```

---

## Implementation Order Summary

1. Database schema (Task 1)
2. Core business logic (Tasks 2-3)
3. API endpoints (Tasks 4, 6-7, 10)
4. Queue processing (Task 5)
5. Sync integration (Task 8)
6. AI toggle update (Task 9)
7. Admin UI components (Tasks 11-13)
8. SSE infrastructure (Tasks 14-17)
9. Client polish (Task 18)
10. Testing (Task 19)

## Notes

- **Global rate limiting**: The queue processor uses in-memory `isProcessing` flag which works for single-server deployments. For multi-instance production, use a distributed lock (Redis) or database-level constraint.
- **Branch-commits relationship**: The `branch_commits` junction table is added in Task 1.6, but **population of this table is not implemented**. Git provider APIs don't natively expose commit→branch mapping efficiently. For accurate branch aggregation in AI jobs, consider:
  1. Tracking branch membership locally by parsing commit SHAs during sync
  2. Using Git command-line locally to get branch membership
  3. Accepting the limitation that branch AI jobs will only include commits explicitly linked
- **SSE connections** should be rate-limited in production to prevent abuse
- Consider adding a cron job or similar for automatic queue processing
- The LLM detection uses Claude Haiku for cost efficiency
- **Manual toggle always wins**: Queue items for manually-tagged sources are deleted before processing (Task 9)
