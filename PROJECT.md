# DoneWithAI - AI Code Detection Dashboard

## What This Project Does
Web dashboard that analyzes Git repositories to detect AI-generated code. Tracks commits & branches from GitHub/Bitbucket, flags AI-generated content with confidence scores.

## For Future AI Agents - Critical Context

### AI Detection Algorithm (src/lib/ai-detector.ts)
**Commit AI Detection:** Pattern-based scoring system
- **AI signals (+score):** "co-pilot", "gpt", "claude", conventional commits (feat/fix/chore), generic single-word messages, structured formatting
- **Human signals (+score):** Multi-line messages, contextual reasoning ("because", "so that"), emotion markers (!!), typos, wip/temp markers
- **Threshold:** aiRatio >= 0.6 = AI, <= 0.4 = Human, between = uncertain
- **Branch detection:** Generic prefixes (feat/fix/), numeric IDs, "ai/bot" keywords, kebab-case length

**DO NOT modify detection logic without understanding the scoring balance - it's tuned to reduce false positives.**

### Architecture Decisions
- **Provider Pattern:** Factory auto-detects GitHub vs Bitbucket from URL - DO NOT break this
- **Database:** Turso (libsql), NOT Postgres despite lib/db.ts having POSTGRES_URL fallback
- **Token Naming:** Bitbucket uses `BITBUCKET_TOKEN_{REPONAME}` convention - critical for multi-repo support
- **Pagination:** Bitbucket API pagination can infinite-loop - MAX_PAGES=100 safety limit in bitbucket-provider.ts

### Known Issues
- Bitbucket `since` parameter doesn't filter - always fetches full history (1-2 min for 2500+ commits)
- Diffstat runs in background with 4s delays (rate limit protection)
- AI detection is pattern-based ONLY - LLM detection exists but requires ANTHROPIC_API_KEY

### Environment Variables Required
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
GITHUB_TOKEN=ghp_... (optional)
BITBUCKET_TOKEN_{REPONAME}=ATCTT3... (per repo)
ANTHROPIC_API_KEY=sk-ant-... (optional, for LLM detection)
```

### Database Schema
```
repos: id, name, url, owner, provider, token_env_var, last_synced, sync_error
commits: id, repo_id, sha, message, author, date, lines_added, lines_removed, is_ai_detected
branches: id, repo_id, name, is_ai_detected
ai_detections: id, commit_id, branch_id, is_ai, confidence_score
```

### Key Files for Modifications
- `src/lib/git/` - Provider implementations, add new Git hosts here
- `src/lib/ai-detector.ts` - AI detection patterns, modify carefully
- `src/app/api/sync/route.ts` - Sync orchestration, handles rate limiting
- `.env.local` - NOT in git, contains actual tokens

### Stack
Next.js 16 (Turbopack), React, TypeScript, Turso DB, Tailwind CSS, shadcn/ui
