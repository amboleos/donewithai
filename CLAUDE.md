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

# Database
# Initialize/reset DB via API: POST /api/init-db
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

Detection runs on commits (message analysis) and branches (naming patterns). LLM-based detection via Anthropic API is optional (requires `ANTHROPIC_API_KEY`).

### Database
Uses Turso (libsql), NOT Postgres. The `@libsql/client` is the primary DB client. Connection is in `src/lib/db.ts` with schema auto-migration in `initDb()`.

**Token naming for multi-repo Bitbucket support:** `BITBUCKET_TOKEN_{REPONAME}` (uppercase) — this is critical for supporting multiple Bitbucket repos with different credentials.

### API Routes
- `/api/repos` — Repo CRUD
- `/api/sync` — Orchestrates Git data fetching and AI detection (handles rate limiting)
- `/api/repos/[id]/{commits,branches,analytics}` — Per-repo data
- `/api/auth/*` — Authentication (login/logout/me)
- `/api/admin/*` — Admin-only operations (users, mappings)

### Auth System
Simple JWT-based auth with bcrypt password hashing. Roles: `admin` | `developer`. First user automatically becomes admin.

## Environment Variables

```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
GITHUB_TOKEN=ghp_... (optional, for GitHub repos)
BITBUCKET_TOKEN_{REPONAME}=ATCTT3... (per Bitbucket repo)
ANTHROPIC_API_KEY=sk-ant-... (optional, for LLM detection)
```

## Known Issues

- Bitbucket API's `since` parameter does not filter—always fetches full history. Large repos (2500+ commits) take 1-2 minutes.
- Diffstat (lines added/removed) runs in background with 4s delays to avoid rate limits.
- Next.js 16 with Turbopack — APIs may differ from documentation. Check `node_modules/next/dist/docs/` for breaking changes.

## Stack

- Next.js 16 (Turbopack), React 19, TypeScript
- Turso DB (`@libsql/client`)
- Tailwind CSS v4, shadcn/ui components
- Anthropic SDK (optional LLM detection)
