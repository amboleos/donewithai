# Admin Dashboard & User Mapping Design

**Date:** 2025-03-21
**Project:** DoneWithAI
**Status:** Draft - Under Review

## Overview

Admin dashboard for repository management, GitHub user-to-system user mapping, and AI detection flag overrides. First registered user automatically becomes admin.

## Requirements

1. **Admin Role Assignment**
   - First registered user (id=1) is automatically admin
   - Check: `user.role === 'admin'` for protected routes
   - Only admins can access `/admin`
   - Only admins can add/edit/delete repositories

2. **Admin Dashboard Features**
   - Repository management (add, delete, sync)
   - GitHub username → System user mapping per repository
   - AI detection flag override for commits and branches

3. **Unmapped Commits**
   - Show GitHub username with " (unmapped)" suffix
   - Still count towards statistics but attributed as "Unmapped"

## Architecture

### Database Schema Changes

```sql
-- Add github_username to users table
ALTER TABLE users ADD COLUMN github_username TEXT;

-- Create user_mappings table
CREATE TABLE user_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repo_id, github_username)
);

-- Create indexes for lookups
CREATE INDEX idx_user_mappings_repo ON user_mappings(repo_id);
CREATE INDEX idx_user_mappings_github ON user_mappings(github_username);
```

### Components

#### 1. Admin Middleware
- Server action or middleware to check `user.role === 'admin'`
- Redirect non-admins to dashboard with toast error

#### 2. Admin Page Structure (`/admin`)

```
┌─────────────────────────────────────────────────┐
│  Admin Dashboard                                 │
├─────────────────────────────────────────────────┤
│  [Repos] [User Mapping] [AI Flags]             │
├─────────────────────────────────────────────────┤
│  Content Area (changes per tab)                 │
└─────────────────────────────────────────────────┘
```

**Repos Tab:**
- List of all repositories
- Add Repository button (opens dialog)
- Delete button per repo
- Sync button per repo

**User Mapping Tab:**
- Repository selector dropdown
- Two sections:
  1. **Unmapped Contributors** - Found in commits, not mapped yet
  2. **Mapped Contributors** - Already mapped
- For each: GitHub Username | Map to User dropdown | Save
- Users can map multiple GitHub usernames to themselves

**AI Flags Tab:**
- Commits list with toggle AI/Human
- Branches list with toggle AI/Human

### GitHub Username Extraction

During repo sync, extract unique GitHub usernames from commits:
- `commit.author` field contains GitHub login (from GitHub API)
- Store in a temporary set, display in User Mapping tab
- When admin maps a username, save to `user_mappings`

### API Endpoints

```
GET  /api/admin/verify              - Check if current user is admin
GET  /api/admin/github-users/:repoId - Get unique GitHub usernames from commits
GET  /api/admin/mappings/:repoId    - Get mappings for repo
POST /api/admin/mappings            - Create/update mapping
DELETE /api/admin/mappings/:id      - Delete mapping
```

### User Flow

1. Admin logs in → Dashboard
2. Clicks "Admin" button → Redirected to `/admin`
3. Selects "User Mapping" tab
4. Selects repository from dropdown
5. Sees list of GitHub usernames from commits (unmapped + mapped)
6. For each unmapped user, selects system user from dropdown
7. Clicks "Save Mapping"
8. Mapping is saved to database

### Data Flow for User Attribution

When viewing analytics:
```
commit.author → user_mappings(github_username, repo_id) → user.name
               (if not found) → commit.author + " (unmapped)"
```

### Bulk Mapping

- "Import from CSV" button for initial setup
- CSV format: `github_username,system_user_email`
- Admin can download template first

## Implementation Notes

- First user check: `user.id === 1 ? role='admin' : role='developer'`
- GitHub usernames come from GitHub API commit.author.login
- Mapping is per-repository
- When a mapped user is deleted, their mappings are also deleted (CASCADE)
