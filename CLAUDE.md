# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server (http://localhost:3000)

# Build & Deploy
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:coverage # Vitest with coverage
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright with UI

# Database
# Initialize/reset DB via API: POST /api/init-db
# Force reset (drops all tables): POST /api/init-db?force=true
```

## Project Structure

```
src/
├── app/                      # Next.js App Router pages & API routes
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Auth page
│   ├── dashboard/page.tsx    # Repo list dashboard
│   ├── admin/page.tsx        # Admin panel (tabs UI)
│   ├── repo/[id]/page.tsx    # Single repo detail (commits, branches, analytics)
│   ├── layout.tsx            # Root layout (Inter font, metadata)
│   ├── providers.tsx         # Client providers: Theme → Auth → Sync
│   ├── globals.css           # Tailwind v4 + design tokens + shadcn theme
│   └── api/                  # Route handlers (see API Routes below)
├── components/
│   ├── admin/                # Admin tabs: repos, mappings, keywords, AI flags, jobs
│   ├── dashboard/            # repo-list.tsx, add-repo-dialog.tsx
│   ├── ui/                   # shadcn/ui primitives (button, dialog, card, table, etc.)
│   ├── sync-progress.tsx     # Global SSE sync indicator (always mounted via Providers)
│   ├── sync-progress-modal.tsx
│   ├── ai-analysis-progress-modal.tsx
│   └── ai-analysis-report-modal.tsx
├── contexts/
│   ├── auth-context.tsx      # JWT session state, login/register/logout
│   ├── sync-context.tsx      # SSE /api/events listener, sync progress state
│   └── theme-context.tsx     # Dark/light theme
├── lib/
│   ├── git/                  # Git provider abstraction (factory pattern)
│   │   ├── provider.ts       # GitProvider interface + shared types
│   │   ├── index.ts          # detectProvider(), parseRepoUrl(), createProvider()
│   │   ├── github-provider.ts
│   │   └── bitbucket-provider.ts
│   ├── db.ts                 # Turso client, schema initDb(), all CRUD helpers
│   ├── ai-detector.ts        # Keyword + LLM-based AI detection (z.ai OpenAI-compat)
│   ├── ai-keywords.ts        # DB keyword cache with TTL
│   ├── ai-jobs.ts            # Quarter-based scoring, resolveUserId, createAIJob
│   ├── ai-queue.ts           # AIQueueProcessor: async LLM queue with retry
│   ├── code-analyzer.ts      # CodeAnalyzer: diff + smart-filter + LLM report
│   ├── smart-filter.ts       # Diff file filtering & LLM text formatting
│   ├── simple-auth.ts        # bcrypt, JWT generate/verify, cookie helpers
│   ├── server-auth.ts        # getServerSession() for route handlers
│   ├── github.ts             # Backward-compat re-exports from git/
│   └── utils.ts              # cn() class merging utility
├── types/
│   └── index.ts              # GitProviderType, ParsedRepoUrl
tests/                        # Vitest unit/integration tests
├── setup.ts                  # Test setup (env, mocks)
├── lib/                      # code-analyzer.test.ts, mock-db.ts, mock-git-provider.ts
└── api/                      # ai-analysis.integration.test.ts
e2e/                          # Playwright E2E tests
├── spec.ts, ai-analysis.spec.ts
├── pages/                    # Page objects
├── utils/testHelpers.ts
└── setup.ts
scripts/                      # Standalone maintenance utilities (not part of app)
├── batch-analyze.mjs         # Batch LLM code analysis for commits via API
├── batch-analyze-branches.mjs # Batch LLM code analysis for branches via API
├── check-progress.mjs        # Show AI detection progress stats from DB
├── check-stats.mjs           # Show commit/branch/analysis summary stats
├── clean-ai-data.mjs         # Reset AI data (code_analyses, is_ai_detected flags)
├── reset-password.mjs        # Dev-only: reset admin password to test123
└── branches.py               # Bitbucket REST API branch listing (Python)
```

## Architecture

### Git Provider Pattern
The codebase uses a factory pattern for Git provider abstraction (`src/lib/git/index.ts`). When adding support for new Git hosts:

1. Create a new provider class in `src/lib/git/{provider}-provider.ts` implementing `GitProvider` interface
2. Add URL pattern to `src/lib/git/index.ts` (e.g., `GITLAB_PATTERN`)
3. Update `detectProvider()` and `parseRepoUrl()` functions
4. Add token env var logic to `getEnvVarName()` if needed

**Critical:** The provider auto-detection via URL regex is core to the architecture—do not bypass it.

### AI Detection System
Located in `src/lib/ai-detector.ts`. Uses pattern-based scoring with configurable thresholds:
- **aiRatio >= 0.6**: AI-generated
- **aiRatio <= 0.4**: Human-written
- **Between**: Uncertain

Detection runs on commits (message analysis) and branches (naming patterns). LLM-based detection via z.ai (OpenAI-compatible) is optional.

### Two-Layer AI Pipeline
1. **Fast path:** `ai_keywords` DB table + `AIDetector` pattern matching → immediate `is_ai_detected` flag
2. **Deep path:** `CodeAnalyzer` fetches diffs via provider, `smart-filter` preps text, z.ai LLM generates `code_analyses` report
3. **Async queue:** `ai_detection_queue` table + `AIQueueProcessor` for batch LLM processing with retry

### SSE Event Bus
Module-level `eventEmitter` in `src/app/api/events/route.ts` — shared across sync, ai-toggle, code-analysis, and recheck-ai routes. Client subscribes via `SyncContext`. Single-process assumption (no horizontal scaling).

### Date Cutoff
`AI_CUTOFF_DATE = '2026-01-01'` in `src/lib/db.ts` — queries only process commits/branches from 2026 onwards.

### Database
Uses Turso (libsql), NOT Postgres. The `@libsql/client` is the primary DB client. Connection is in `src/lib/db.ts` with schema auto-migration in `initDb()`.

**Token naming for multi-repo Bitbucket support:** `BITBUCKET_TOKEN_{REPONAME}` (uppercase) — this is critical for supporting multiple Bitbucket repos with different credentials.

#### Schema (11 tables)

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `repos` | Repository registry | url, owner, provider, token_env_var |
| `commits` | Commit history | sha UNIQUE, repo_id FK, is_ai_detected |
| `branches` | Branch list | UNIQUE(repo_id, name), is_ai_detected |
| `users` | Auth users | email UNIQUE, role (admin/developer) |
| `user_mappings` | Git author → user | repo_id + github_username → user_id |
| `ai_detections` | Detection results | commit_id or branch_id, confidence_score |
| `ai_detection_queue` | Async LLM queue | status (pending/processing/completed/failed), retry_count |
| `ai_jobs` | Quarter scoring | UNIQUE(repo_id, source_type, source_id), points |
| `ai_keywords` | Manageable keywords | keyword, is_active; seeded with defaults |
| `code_analyses` | LLM code reports | UNIQUE(repo_id, source_type, source_id), report JSON |
| `branch_commits` | Branch-commit join | For per-branch aggregation |

### API Routes
- `/api/repos` — Repo CRUD (GET public, POST/DELETE admin)
- `/api/repos/[id]` — Single repo
- `/api/repos/[id]/commits` — Commit list
- `/api/repos/[id]/branches` — Branch list
- `/api/repos/[id]/analytics` — Analytics
- `/api/repos/[id]/analytics-mapped` — Analytics with user mappings
- `/api/sync` — POST admin: full sync (commits, branches, AI detection, diffstat, SSE events)
- `/api/sync/recheck-ai` — POST admin: re-run AI detection
- `/api/ai-toggle` — POST admin: manual AI flag toggle
- `/api/ai/code-analysis` — POST admin: LLM code analysis; GET: fetch analysis
- `/api/ai/jobs` — GET: job list or period report
- `/api/ai/process-queue` — POST admin: process LLM queue
- `/api/detect` — POST: raw text AI detection (no auth, external tool use)
- `/api/events` — GET SSE: real-time sync/analysis events (session required)
- `/api/init-db` — GET/POST: schema init; `?force=true` drops+recreates
- `/api/auth/*` — login, register, logout, me
- `/api/admin/*` — users, mappings, keywords, github-users, verify
- `/api/webhooks/github` — POST: HMAC-verified GitHub push webhook
- `/api/debug/*` — Development-only debug endpoints (branches, clear-branches, test-provider, bitbucket-branches)

### Auth System
Simple JWT-based auth with bcrypt password hashing. Roles: `admin` | `developer`. First user automatically becomes admin.

- Password: `bcryptjs` (`src/lib/simple-auth.ts`)
- Session: JWT 7-day expiry; `JWT_SECRET` env (falls back to `dev-secret-change-in-production`)
- Transport: httpOnly `auth_token` cookie; `getServerSession` also accepts `Authorization: Bearer`
- Client: `AuthProvider` polls `/api/auth/me`

### Provider Hierarchy (Client-side)
`ThemeProvider` → `AuthProvider` → `SyncProvider` → children + `SyncProgress` + `Toaster`

## Environment Variables

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
GITHUB_TOKEN=ghp_... (optional, for GitHub repos)
BITBUCKET_TOKEN_{REPONAME}=ATCTT3... (per Bitbucket repo)
ANTHROPIC_API_KEY=sk-ant-... (optional, for LLM detection)
JWT_SECRET=... (optional, defaults to dev secret)
```

## Known Issues

- Bitbucket API's `since` parameter does not filter—always fetches full history. Large repos (2500+ commits) take 1-2 minutes.
- Diffstat (lines added/removed) runs in background with 4s delays to avoid rate limits.
- Next.js 16 with Turbopack — APIs may differ from documentation. Check `node_modules/next/dist/docs/` for breaking changes.
- SSE event bus is in-process only; will not work with multiple server instances.
- `/api/auth/me` returns only JWT fields (no name/github_username from DB).
- `initDb()` `dropAllTables()` does not drop `code_analyses` — schema mismatch on force reset.

## Stack

- Next.js 16 (Turbopack), React 19, TypeScript
- Turso DB (`@libsql/client`)
- Tailwind CSS v4, shadcn/ui components (`@radix-ui/*` primitives)
- z.ai / OpenAI-compatible SDK (`openai` package) for LLM detection
- `recharts` for analytics charts
- `date-fns` for date formatting
- `bcryptjs` + `jsonwebtoken` for auth
- `octokit` for GitHub API (used inside github-provider)
- `sonner` for toast notifications

## Maintenance Scripts (`scripts/`)

Standalone utilities for batch operations and DB diagnostics. Not part of the app, not in `package.json`. Run with `node scripts/<name>` from project root.

| Script | Purpose |
|--------|---------|
| `batch-analyze.mjs` | Batch LLM code analysis for commits (calls `/api/ai/code-analysis`) |
| `batch-analyze-branches.mjs` | Same for branches |
| `check-progress.mjs` | Show AI detection progress (processed/unprocessed counts) |
| `check-stats.mjs` | Summary stats (commits, analyses, branches) |
| `clean-ai-data.mjs` | Reset all AI data (code_analyses, is_ai_detected flags); preserves users |
| `reset-password.mjs` | Dev-only: reset admin password to `test123` |
| `branches.py` | Bitbucket REST API branch listing (requires `BITBUCKET_TOKEN` env) |

### Generated Artifacts (gitignored)
`playwright-report/`, `test-results/`, `coverage/`, `dogfood-output/`, `test.db`

## Unused Source Files

These source files exist but are not actively used — candidates for cleanup:

- `src/lib/design-tokens.ts` — oklch design tokens, never imported anywhere
- `src/app/api/debug/*` (4 routes) — development debug endpoints; not needed in production
- `src/app/api/detect/route.ts` — standalone AI detection endpoint; not called from within the app (may be used by external tools)
- `src/lib/github.ts` — backward-compat re-export from `git/`; can be replaced with direct imports
