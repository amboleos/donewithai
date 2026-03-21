# AI Job Tracking System - Design Spec

**Date:** 2025-03-21
**Status:** Approved
**Author:** Claude Code

## Overview

A system to track AI-assisted work for quarterly bonus calculations. Developers earn "AI jobs" based on features/bug fixes completed with AI assistance. Each 200 lines changed = 1 point.

## Goals

1. Track AI-assisted work for quarterly bonus periods (Q1-Q4)
2. Calculate AI jobs per developer per repository
3. Real-time progress updates for all logged-in users
4. Admin-manageable AI keywords
5. Manual AI tagging by admin

## Periods

- Q1: Jan 1 - Mar 31
- Q2: Apr 1 - Jun 30
- Q3: Jul 1 - Sep 30
- Q4: Oct 1 - Dec 31

## Scoring Formula

```
Points = floor((lines_added + lines_removed) / 200)
```

- Example: 615 lines changed = 3 points
- Master commits and branch commits tracked separately

## Database Schema

### New Tables

```sql
-- AI detection queue (pending LLM checks)
CREATE TABLE ai_detection_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  commit_id INTEGER,
  branch_id INTEGER,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  error TEXT
);

-- Confirmed AI jobs (counts toward bonus)
CREATE TABLE ai_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  period TEXT NOT NULL, -- '2025-Q1', '2025-Q2', etc.
  source_type TEXT NOT NULL, -- 'commit', 'branch'
  source_id INTEGER NOT NULL, -- commit.id or branch.id
  points INTEGER NOT NULL,
  detection_method TEXT NOT NULL, -- 'keyword', 'llm', 'manual'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, source_type, source_id) -- Prevent duplicates
);

-- Admin-manageable AI keywords
CREATE TABLE ai_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_ai_queue_status ON ai_detection_queue(status);
CREATE INDEX idx_ai_queue_repo ON ai_detection_queue(repo_id);
CREATE INDEX idx_ai_jobs_period ON ai_jobs(period);
CREATE INDEX idx_ai_jobs_user ON ai_jobs(user_id);
CREATE INDEX idx_ai_jobs_repo ON ai_jobs(repo_id);
```

## API Routes

### Modified: POST /api/repos/{id}/sync

Flow:
1. Fetch commits from Git provider
2. Keyword match check
3. If keyword found AND lines_changed >= 200 → Create ai_job (detection_method: 'keyword')
4. If no keyword match → Add to ai_detection_queue (for LLM check)
5. Emit SSE: `sync_started`
6. Trigger background queue processor

### New: POST /api/ai/process-queue

Background worker that:
1. Acquires lock on queue item
2. Calls LLM API (z.ai)
3. If AI detected AND lines_changed >= 200 → Create ai_job (detection_method: 'llm')
4. Marks queue item completed
5. Emits SSE: `progress`

### New: GET /api/events

Server-Sent Events endpoint for real-time updates.

**Event Types:**
```typescript
{ type: 'sync_started', data: { repoId: number, repoName: string, totalCommits: number, timestamp: string } }
{ type: 'progress', data: { repoId: number, processed: number, total: number, percentage: number, currentCommit: string } }
{ type: 'sync_completed', data: { repoId: number, aiJobsFound: number, duration: number } }
{ type: 'ai_tagged', data: { type: 'commit'|'branch', id: number, userName: string } }
```

### New: /api/admin/keywords

- `GET` - List all keywords
- `POST` - Add new keyword
- `DELETE` - Delete keyword

### New: GET /api/ai/jobs

Query params: `repoId`, `period`, `userId`

Returns report with:
- Period summary (total jobs, total points, top contributor)
- By developer breakdown (with repo breakdown per developer)
- Job details list (sortable by points, created_at, userName)

### Modified: POST /api/ai-toggle

For branches:
- When marking branch as AI → All commits in branch get ai_job entries
- detection_method: 'manual'

For commits:
- Single commit gets ai_job entry

## Rate Limiting

- Max 1 LLM request at a time globally
- SQLite row-level lock:
  ```sql
  UPDATE ai_detection_queue
  SET status='processing', started_at=CURRENT_TIMESTAMP
  WHERE id=? AND status='pending'
  ```
- If affected_rows = 0, another process has it, skip
- 1 second delay between requests

## Cooldown

- 15 minutes between manual syncs per user
- Stored in localStorage on client

## AI Detection Flow

```
Commit arrives
  ↓
Keyword match?
  ├─ Yes → Lines >= 200? → ai_job (keyword)
  └─ No  → Add to queue → LLM check → AI? + Lines >= 200? → ai_job (llm)
```

## Default Keywords

```
auto-claude, copilot, ai-generated, gpt, llm, claude,
chatgpt, gemini, openai, ai assist, ai assisted
```

## UI Components

### Global Progress Bar

Shows for all logged-in users when sync is active:
- Repo name
- Progress percentage
- Processed/total commits
- Current commit message
- Time elapsed

### Admin: Keywords Tab

- List of keywords with active/inactive status
- Add new keyword input
- Delete button per keyword
- Toggle active button

### Admin: AI Jobs Report

- Period selector dropdown
- Repo selector (optional)
- Summary cards: total jobs, total points, top contributor
- Developer table: name, total jobs, total points
- Click developer → expand repo breakdown
- Job details table: sortable by points/date/name

## Implementation Order

1. Database migration (new tables)
2. AI keywords API + admin UI
3. Queue processor with LLM integration
4. SSE endpoint + client progress component
5. Modified sync with queue integration
6. AI jobs report API + UI
7. Modified AI toggle for branch handling
8. Client-side cooldown

## Testing

- Unit: Queue lock mechanism, period calculation
- Integration: LLM API call, SSE connection
- E2E: Full sync flow with progress updates
