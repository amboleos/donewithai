# Admin Dashboard & User Mapping Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin dashboard with repository management, GitHub-to-system user mapping, and AI flag override capabilities.

**Architecture:** Client-side React components with Next.js API routes. Turso (SQLite) database with new tables for user mappings. JWT-based auth with role checking.

**Tech Stack:** Next.js 16, React 19, Turso libsql, JWT, bcrypt

---

## Chunk 1: Database Schema & Role System

### Task 1.1: Add role and github_username to users table

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Update User interface**

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  github_username: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Update initDb to add new columns**

```typescript
export async function initDb() {
  // ... existing table creations ...

  // Add role and github_username if they don't exist (for existing DBs)
  try {
    await client.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'developer'`);
  } catch (e) {
    // Column might already exist
  }

  try {
    await client.execute(`ALTER TABLE users ADD COLUMN github_username TEXT`);
  } catch (e) {
    // Column might already exist
  }

  // Set first user as admin if no admin exists
  await client.execute(`
    UPDATE users SET role = 'admin'
    WHERE id = 1 AND role = 'developer'
  `);
}
```

- [ ] **Step 3: Update upsertUser to include github_username**

```typescript
export async function upsertUser(
  email: string,
  name: string,
  password: string,
  githubUsername?: string
) {
  const result = await client.execute({
    sql: `
      INSERT INTO users (email, name, password, github_username)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (email) DO UPDATE SET
        name = excluded.name,
        password = excluded.password,
        github_username = excluded.github_username
      RETURNING *
    `,
    args: [email, name, password, githubUsername || null],
  });
  return result.rows[0] as unknown as User;
}
```

- [ ] **Step 4: Create user_mappings table**

```typescript
export interface UserMapping {
  id: number;
  repo_id: number;
  github_username: string;
  user_id: number;
  created_at: string;
}

// In initDb, after users table:
await client.execute(`
  CREATE TABLE IF NOT EXISTS user_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    github_username TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_id, github_username)
  )
`);

await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_repo ON user_mappings(repo_id)`);
await client.execute(`CREATE INDEX IF NOT EXISTS idx_user_mappings_github ON user_mappings(github_username)`);
```

- [ ] **Step 5: Add mapping CRUD functions**

```typescript
// User mapping operations
export async function createUserMapping(
  repoId: number,
  githubUsername: string,
  userId: number
) {
  const result = await client.execute({
    sql: `
      INSERT INTO user_mappings (repo_id, github_username, user_id)
      VALUES (?, ?, ?)
      RETURNING *
    `,
    args: [repoId, githubUsername.toLowerCase(), userId],
  });
  return result.rows[0] as unknown as UserMapping;
}

export async function getMappingsByRepo(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT um.*, u.name, u.email
      FROM user_mappings um
      JOIN users u ON um.user_id = u.id
      WHERE um.repo_id = ?
      ORDER BY um.github_username
    `,
    args: [repoId],
  });
  return result.rows as unknown as (UserMapping & { name: string; email: string })[];
}

export async function deleteMapping(id: number) {
  await client.execute({
    sql: `DELETE FROM user_mappings WHERE id = ?`,
    args: [id],
  });
}

export async function getGithubUsersByRepo(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT DISTINCT author
      FROM commits
      WHERE repo_id = ?
      ORDER BY author
    `,
    args: [repoId],
  });
  return result.rows.map((row: any) => row.author) as string[];
}

export async function getAllUsers() {
  const result = await client.execute({
    sql: `SELECT id, name, email, github_username, role FROM users ORDER BY name`,
  });
  return result.rows as unknown as User[];
}
```

- [ ] **Step 6: Test database changes**

```bash
curl -s "http://localhost:3000/api/init-db?force=true"
```

Expected: `{"success":true,...}`

- [ ] **Step 7: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add role, github_username and user_mappings table"
```

---

## Chunk 2: Protect Existing Admin Endpoints

### Task 2.1: Add admin protection to existing endpoints

**Files:**
- Modify: `src/app/api/admin/all/route.ts`

- [ ] **Step 1: Add admin verification to /api/admin/all**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { verifyToken } from '@/lib/simple-auth';

export async function GET(req: NextRequest) {
  // Verify admin
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // ... rest of existing code ...
```

- [ ] **Step 2: Test protection**

```bash
# Login as regular user and try to access
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' \
  | jq -r '.token')

curl -s http://localhost:3000/api/admin/all \
  -H "Cookie: auth_token=$TOKEN" | jq .
```

Expected: `{"error":"Forbidden"}, status: 403`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/all/route.ts
git commit -m "fix: add admin protection to /api/admin/all endpoint"
```

---

## Chunk 3: Auth Role Integration

### Task 3.1: Update auth to handle roles

**Files:**
- Modify: `src/lib/simple-auth.ts`
- Modify: `src/contexts/auth-context.tsx`

- [ ] **Step 1: Update JWTPayload interface**

```typescript
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}
```

- [ ] **Step 2: Update User interface**

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  github_username: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Update AuthContext User interface**

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  github_username?: string | null;
}
```

- [ ] **Step 4: Add isAdmin helper to AuthContext**

```typescript
isAdmin: () => boolean;
```

```typescript
const isAdmin = () => user?.role === 'admin';

return (
  <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin }}>
    {children}
  </AuthContext.Provider>
);
```

- [ ] **Step 5: Update register API to set first user as admin**

Modify `src/app/api/auth/register/route.ts`:

```typescript
// Check if this is the first user
const existingUsers = await client.execute({
  sql: `SELECT COUNT(*) as count FROM users`,
});
const isFirstUser = (existingUsers.rows[0] as any).count === 0;

const role = isFirstUser ? 'admin' : 'developer';

const result = await client.execute({
  sql: `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?) RETURNING *`,
  args: [email, hashedPassword, name, role],
});
```

- [ ] **Step 6: Create admin verify API**

Create `src/app/api/admin/verify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ isAdmin: false }, { status: 403 });
  }

  return NextResponse.json({ isAdmin: true });
}
```

- [ ] **Step 7: Test auth changes**

```bash
# Reset DB
curl -s "http://localhost:3000/api/init-db?force=true"

# Register first user (should be admin)
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123","name":"Admin"}'

# Login as admin
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' | jq .

# Verify admin status (use token from above)
TOKEN="<token-from-login>"
curl -s http://localhost:3000/api/admin/verify \
  -H "Cookie: auth_token=$TOKEN" | jq .
```

Expected: `{"isAdmin":true}`

- [ ] **Step 8: Commit**

```bash
git add src/lib/simple-auth.ts src/contexts/auth-context.tsx src/app/api/auth/register/route.ts src/app/api/admin/verify/route.ts
git commit -m "feat: add role-based auth with admin verification"
```

---

## Chunk 4: Admin API Endpoints

### Task 4.1: Create user mapping APIs

**Files:**
- Create: `src/app/api/admin/github-users/[repoId]/route.ts`
- Create: `src/app/api/admin/mappings/route.ts`
- Create: `src/app/api/admin/mappings/[id]/route.ts`

- [ ] **Step 1: Create github-users API**

```typescript
// src/app/api/admin/github-users/[repoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { getGithubUsersByRepo, getMappingsByRepo } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repoId: string }> }
) {
  // Verify admin
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { repoId } = await params;
  const githubUsers = await getGithubUsersByRepo(parseInt(repoId));
  const mappings = await getMappingsByRepo(parseInt(repoId));
  const mappedUsernames = new Set(mappings.map((m) => m.github_username));

  const unmapped = githubUsers.filter((u) => !mappedUsernames.has(u.toLowerCase()));

  return NextResponse.json({
    unmapped,
    mapped: mappings,
  });
}
```

- [ ] **Step 2: Create mappings create API**

```typescript
// src/app/api/admin/mappings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { createUserMapping } from '@/lib/db';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { repoId, githubUsername, userId } = await req.json();

  try {
    const mapping = await createUserMapping(
      parseInt(repoId),
      githubUsername,
      parseInt(userId)
    );
    return NextResponse.json({ mapping });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create mapping' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create mappings delete API**

```typescript
// src/app/api/admin/mappings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { deleteMapping } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  await deleteMapping(parseInt(id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create all users API**

Create `src/app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { getAllUsers } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}
```

- [ ] **Step 5: Test APIs**

```bash
# Login as admin and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  | jq -r '.token')

# Test get users
curl -s http://localhost:3000/api/admin/users \
  -H "Cookie: auth_token=$TOKEN" | jq .

# Test github-users (need a repo first)
curl -s "http://localhost:3000/api/admin/github-users/1" \
  -H "Cookie: auth_token=$TOKEN" | jq .
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat: add admin APIs for user mappings"
```

---

## Chunk 5: Admin UI - Page Structure

### Task 5.1: Create admin page with tabs

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/components/admin/admin-tabs.tsx`
- Create: `src/components/admin/repos-tab.tsx`
- Create: `src/components/admin/mappings-tab.tsx`
- Create: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Update admin page structure**

```typescript
// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AdminTabs from '@/components/admin/admin-tabs';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      checkAdmin();
    }
  }, [authLoading, user, router]);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Shield className="h-8 w-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Manage repos and user mappings</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AdminTabs />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create tabs component**

```typescript
// src/components/admin/admin-tabs.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, GitBranch, Brain } from 'lucide-react';
import ReposTab from './repos-tab';
import MappingsTab from './mappings-tab';
import AIFlagsTab from './ai-flags-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags';

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('repos');

  return (
    <div>
      <div className="flex gap-2 mb-6">
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
      </div>

      {activeTab === 'repos' && <ReposTab />}
      {activeTab === 'mappings' && <MappingsTab />}
      {activeTab === 'ai-flags' && <AIFlagsTab />}
    </div>
  );
}
```

- [ ] **Step 3: Create repos tab (reuse existing components)**

```typescript
// src/components/admin/repos-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AddRepoDialog from '@/components/dashboard/add-repo-dialog';
import RepoList from '@/components/dashboard/repo-list';

interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  last_synced: string | null;
}

export default function ReposTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch {
      toast.error('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleAddRepo = async (url: string) => {
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to add repo');

      const data = await res.json();
      setRepos((prev) => [data.repo, ...prev]);
      setAddDialogOpen(false);
      toast.success('Repository added');
    } catch {
      toast.error('Failed to add repository');
    }
  };

  const handleDeleteRepo = async (id: number) => {
    try {
      await fetch(`/api/repos?id=${id}`, { method: 'DELETE' });
      setRepos((prev) => prev.filter((r) => r.id !== id));
      toast.success('Repository deleted');
    } catch {
      toast.error('Failed to delete repository');
    }
  };

  const handleSyncRepo = async (url: string) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to sync');
      toast.success('Repository synced');
      fetchRepos();
    } catch {
      toast.error('Failed to sync repository');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Repositories</CardTitle>
          <Button onClick={() => setAddDialogOpen(true)}>Add Repository</Button>
        </div>
      </CardHeader>
      <CardContent>
        {repos.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No repositories yet</p>
        ) : (
          <RepoList
            repos={repos}
            onDelete={handleDeleteRepo}
            onSync={handleSyncRepo}
          />
        )}
      </CardContent>
      <AddRepoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddRepo}
      />
    </Card>
  );
}
```

- [ ] **Step 4: Create AI flags tab**

```typescript
// src/components/admin/ai-flags-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Commit {
  id: number;
  sha: string;
  message: string;
  author: string;
  repo_id: number;
  is_ai_detected: number | null;
  repo_name: string;
}

interface Branch {
  id: number;
  name: string;
  repo_id: number;
  is_ai_detected: number | null;
  repo_name: string;
}

export default function AIFlagsTab() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/all');
      const data = await res.json();
      setCommits(data.commits || []);
      setBranches(data.branches || []);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAI = async (type: 'commit' | 'branch', id: number, currentValue: number | null) => {
    try {
      await fetch('/api/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, isAI: !currentValue }),
      });
      toast.success(`${type} AI flag updated`);
      fetchData();
    } catch {
      toast.error('Failed to update AI flag');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Detection Flags</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'commits' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('commits')}
            >
              Commits ({commits.length})
            </Button>
            <Button
              variant={activeTab === 'branches' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('branches')}
            >
              Branches ({branches.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(activeTab === 'commits' ? commits : branches).map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {(item as Commit).message || (item as Branch).name}
                </p>
                <p className="text-xs text-slate-500">
                  {(item as Commit).author || ''} • {(item as any).repo_name} •
                  {(item as Commit).sha?.substring(0, 7) || ''}
                </p>
              </div>
              <Button
                variant={item.is_ai_detected ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  toggleAI(
                    activeTab === 'commits' ? 'commit' : 'branch',
                    item.id,
                    item.is_ai_detected
                  )
                }
              >
                {item.is_ai_detected ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    AI
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Human
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/
git commit -m "feat: add admin page structure with tabs"
```

---

## Chunk 6: Use Mappings in Analytics

### Task 6.1: Update analytics to show mapped user names

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/app/repo/[id]/page.tsx`

- [ ] **Step 1: Add function to get mapped user name**

```typescript
// In src/lib/db.ts

export async function getMappedAuthor(repoId: number, githubAuthor: string): Promise<string> {
  const result = await client.execute({
    sql: `
      SELECT u.name
      FROM user_mappings um
      JOIN users u ON um.user_id = u.id
      WHERE um.repo_id = ? AND LOWER(um.github_username) = LOWER(?)
    `,
    args: [repoId, githubAuthor],
  });

  if (result.rows.length > 0) {
    return (result.rows[0] as any).name;
  }

  // Return with (unmapped) suffix
  return `${githubAuthor} (unmapped)`;
}

export async function getDeveloperStatsWithMappings(repoId: number) {
  const result = await client.execute({
    sql: `
      SELECT
        c.author,
        COUNT(*) as total_commits,
        SUM(c.lines_added) as total_lines_added,
        SUM(c.lines_removed) as total_lines_removed,
        SUM(CASE WHEN c.is_ai_detected = 1 THEN 1 ELSE 0 END) as ai_commits,
        ROUND(
          100.0 * SUM(CASE WHEN c.is_ai_detected = 1 THEN 1 ELSE 0 END) / CAST(COUNT(*) AS REAL),
          1
        ) as ai_percentage
      FROM commits c
      WHERE c.repo_id = ?
      GROUP BY c.author
      ORDER BY total_commits DESC
    `,
    args: [repoId],
  });

  const rows = result.rows as any[];

  // Apply mappings
  const stats = await Promise.all(
    rows.map(async (row) => {
      const mappedName = await getMappedAuthor(repoId, row.author);
      return {
        ...row,
        author: mappedName,
        originalAuthor: row.author,
      };
    })
  );

  return stats;
}
```

- [ ] **Step 2: Update repo detail page to use mapped stats**

```typescript
// In src/app/repo/[id]/page.tsx

// In fetchData function, replace analytics call:
const analyticsRes = await fetch(`/api/repos/${repoId}/analytics?days=30`);

// Update API to use new function - create /api/repos/[id]/analytics-mapped
const analyticsMappedRes = await fetch(`/api/repos/${repoId}/analytics-mapped?days=30`);
const analyticsData = await analyticsMappedRes.json();
```

- [ ] **Step 3: Create analytics-mapped API**

Create `src/app/api/repos/[id]/analytics-mapped/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRepoAnalytics, getDeveloperStatsWithMappings } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repoId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const [analytics, developerStats] = await Promise.all([
      getRepoAnalytics(repoId, days),
      getDeveloperStatsWithMappings(repoId),
    ]);

    return NextResponse.json({ analytics, developerStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Test mapped names display**

```bash
# 1. Add a repo and sync
# 2. Map a GitHub user
# 3. View analytics - should show "John Doe (unmapped)" or "John Doe" if mapped
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts src/app/api/repos/[id]/analytics-mapped/route.ts src/app/repo/[id]/page.tsx
git commit -m "feat: use user mappings in analytics display"
```

---

## Chunk 7: User Mapping UI

### Task 7.1: Create user mapping tab component

**Files:**
- Create: `src/components/admin/mappings-tab.tsx`

- [ ] **Step 1: Create mappings tab component**

```typescript
// src/components/admin/mappings-tab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Repo {
  id: number;
  name: string;
}

interface SystemUser {
  id: number;
  name: string;
  email: string;
}

interface Mapping {
  id: number;
  github_username: string;
  user_id: number;
  name: string;
  email: string;
}

interface GithubUser {
  username: string;
  selectedUserId?: number;
}

export default function MappingsTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [unmappedUsers, setUnmappedUsers] = useState<string[]>([]);
  const [mappedUsers, setMappedUsers] = useState<Mapping[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRepos();
    fetchSystemUsers();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch {
      toast.error('Failed to fetch repositories');
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setSystemUsers(data.users || []);
    } catch {
      toast.error('Failed to fetch users');
    }
  };

  const fetchMappings = async (repoId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/github-users/${repoId}`);
      const data = await res.json();
      setUnmappedUsers(data.unmapped || []);
      setMappedUsers(data.mapped || []);
    } catch {
      toast.error('Failed to fetch mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoChange = (repoId: string) => {
    const id = parseInt(repoId);
    setSelectedRepoId(id);
    setPendingMappings({});
    fetchMappings(id);
  };

  const handleMappingChange = (githubUsername: string, userId: string) => {
    setPendingMappings((prev) => ({
      ...prev,
      [githubUsername]: parseInt(userId),
    }));
  };

  const saveMapping = async (githubUsername: string) => {
    const userId = pendingMappings[githubUsername];
    if (!userId || !selectedRepoId) return;

    try {
      await fetch('/api/admin/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: selectedRepoId,
          githubUsername,
          userId,
        }),
      });

      toast.success('Mapping saved');
      fetchMappings(selectedRepoId);
      setPendingMappings((prev) => {
        const updated = { ...prev };
        delete updated[githubUsername];
        return updated;
      });
    } catch {
      toast.error('Failed to save mapping');
    }
  };

  const deleteMapping = async (mappingId: number) => {
    try {
      await fetch(`/api/admin/mappings/${mappingId}`, { method: 'DELETE' });
      toast.success('Mapping deleted');
      if (selectedRepoId) fetchMappings(selectedRepoId);
    } catch {
      toast.error('Failed to delete mapping');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Mapping</CardTitle>
        <p className="text-sm text-slate-500">
          Map GitHub usernames to system users for each repository
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Repository Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Repository</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedRepoId || ''}
              onChange={(e) => handleRepoChange(e.target.value)}
            >
              <option value="">-- Select a repository --</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRepoId && (
            <>
              {/* Unmapped Users */}
              {unmappedUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Unmapped Contributors</h3>
                  <div className="space-y-2">
                    {unmappedUsers.map((username) => (
                      <div
                        key={username}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{username}</p>
                          <p className="text-xs text-slate-500">GitHub username</p>
                        </div>
                        <select
                          className="p-2 border rounded-md"
                          value={pendingMappings[username] || ''}
                          onChange={(e) => handleMappingChange(username, e.target.value)}
                        >
                          <option value="">-- Select user --</option>
                          {systemUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => saveMapping(username)}
                          disabled={!pendingMappings[username]}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapped Users */}
              {mappedUsers.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Mapped Contributors</h3>
                  <div className="space-y-2">
                    {mappedUsers.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950"
                      >
                        <div>
                          <p className="font-medium">{mapping.github_username}</p>
                          <p className="text-sm text-slate-600">
                            → {mapping.name} ({mapping.email})
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMapping(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unmappedUsers.length === 0 && mappedUsers.length === 0 && !loading && (
                <p className="text-slate-500 text-center py-8">
                  No contributors found. Sync the repository first.
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/mappings-tab.tsx
git commit -m "feat: add user mapping tab component"
```

---

## Chunk 8: Update Dashboard for Admin Only

### Task 8.1: Restrict repo management to admins only

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/repo-list.tsx`

- [ ] **Step 1: Add isAdmin state to dashboard**

```typescript
// In src/app/dashboard/page.tsx
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  if (!authLoading && !user) {
    router.push('/login');
  } else if (user) {
    fetchRepos();
    checkAdmin();
  }
}, [authLoading, user, router]);

const checkAdmin = async () => {
  try {
    const res = await fetch('/api/admin/verify');
    setIsAdmin(res.ok);
  } catch {
    setIsAdmin(false);
  }
};
```

- [ ] **Step 2: Pass isAdmin to RepoList**

```typescript
<RepoList
  repos={repos}
  onDelete={isAdmin ? handleDeleteRepo : undefined}
  onSync={handleSyncRepo}
  canAdd={isAdmin}
  onAdd={isAdmin ? handleAddRepo : undefined}
/>
```

- [ ] **Step 3: Update RepoList props interface**

```typescript
interface RepoListProps {
  repos: Repo[];
  onDelete?: (id: number) => void;
  onSync: (url: string) => void;
  canAdd?: boolean;
  onAdd?: (url: string) => void;
}
```

- [ ] **Step 4: Update RepoList component**

```typescript
export default function RepoList({ repos, onDelete, onSync, canAdd, onAdd }: RepoListProps) {
  // In the component, conditionally render delete button
  {onDelete && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (confirm('Are you sure?')) onDelete(r.id);
      }}
    >
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  )}
}
```

- [ ] **Step 5: Update dashboard Add Repository button**

```typescript
{isAdmin && (
  <Button onClick={() => setAddDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Add Repository
  </Button>
)}
```

- [ ] **Step 6: Test admin restrictions**

```bash
# Create non-admin user
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123","name":"Regular User"}'

# Login as regular user - should not see Add button or delete options
```

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/dashboard/repo-list.tsx
git commit -m "feat: restrict repo management to admins only"
```

---

## Chunk 9: Dogfood Testing

### Task 9.1: Test all flows

- [ ] **Step 1: Test admin user flow**

1. Reset database
2. Register first user (should be admin)
3. Login as admin
4. Access `/admin` - should work
5. Add a repository
6. Sync repository
7. Go to User Mapping tab
8. Map GitHub users
9. Toggle AI flags

- [ ] **Step 2: Test regular user flow**

1. Register second user (should NOT be admin)
2. Login as regular user
3. Try to access `/admin` - should redirect to dashboard
4. Dashboard should NOT show Add Repository button
5. Cannot delete repositories
6. Can view repo details

- [ ] **Step 3: Test user mapping in analytics**

1. Login as admin
2. Map GitHub users for a repo
3. View repo analytics
4. Verify commits show mapped user names

- [ ] **Step 4: Fix any issues found**

Document and fix any bugs discovered during testing.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "test: complete dogfood testing and fixes"
```

---

## Completion Checklist

- [ ] All tasks completed
- [ ] Database migrations tested
- [ ] Admin verification works
- [ ] User mapping functional
- [ ] AI flag override works
- [ ] Non-admin users restricted correctly
- [ ] All commits pushed
