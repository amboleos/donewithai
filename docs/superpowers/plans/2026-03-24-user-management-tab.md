# User Management Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full CRUD user management tab to the admin panel.

**Architecture:** New `UsersTab` component following existing tab patterns, with `UserDialog` for add/edit operations. Backend extends existing `/api/admin/users` endpoint and adds new `/api/admin/users/[id]` route for update/delete operations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Turso DB, shadcn/ui, sonner for toasts

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db.ts` | Modify | Add `createUser`, `updateUser`, `deleteUser`, extend `PublicUser`, update `getAllUsers` |
| `src/app/api/admin/users/route.ts` | Modify | Add POST handler |
| `src/app/api/admin/users/[id]/route.ts` | Create | PUT and DELETE handlers |
| `src/components/admin/user-dialog.tsx` | Create | Add/edit dialog form |
| `src/components/admin/users-tab.tsx` | Create | Main tab component |
| `src/components/admin/admin-tabs.tsx` | Modify | Add Users tab with shortcut 6 |

---

## Task 1: Database Functions

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1.1: Extend PublicUser interface**

Find the `PublicUser` interface (around line 71) and add `created_at`:

```typescript
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  github_username: string | null;
  role: string;
  created_at: string;  // ADD THIS LINE
}
```

- [ ] **Step 1.2: Update getAllUsers to include created_at**

Find `getAllUsers` function (around line 763) and update the SQL:

```typescript
export async function getAllUsers(): Promise<PublicUser[]> {
  const result = await client.execute({
    sql: `SELECT id, name, email, github_username, role, created_at FROM users ORDER BY name`,
  });
  return result.rows as unknown as PublicUser[];
}
```

- [ ] **Step 1.3: Add createUser function**

Add after `getAllUsers` function:

```typescript
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
  github_username?: string | null;
}): Promise<User> {
  const githubUsername = data.github_username?.trim().toLowerCase() || null;

  const result = await client.execute({
    sql: `INSERT INTO users (name, email, password, role, github_username)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, email, role, github_username, password, created_at`,
    args: [data.name.trim(), data.email.trim().toLowerCase(), data.password, data.role, githubUsername],
  });

  return result.rows[0] as unknown as User;
}
```

- [ ] **Step 1.4: Add updateUser function**

Add after `createUser`:

```typescript
export async function updateUser(id: number, data: {
  name?: string;
  email?: string;
  role?: string;
  github_username?: string | null;
}): Promise<User | null> {
  const updates: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    args.push(data.name.trim());
  }
  if (data.email !== undefined) {
    updates.push('email = ?');
    args.push(data.email.trim().toLowerCase());
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    args.push(data.role);
  }
  if (data.github_username !== undefined) {
    updates.push('github_username = ?');
    args.push(data.github_username?.trim().toLowerCase() || null);
  }

  if (updates.length === 0) {
    return null;
  }

  args.push(id);

  const result = await client.execute({
    sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?
          RETURNING id, name, email, role, github_username, password, created_at`,
    args,
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as User;
}
```

- [ ] **Step 1.5: Add deleteUser function**

Add after `updateUser`:

```typescript
export async function deleteUser(id: number): Promise<boolean> {
  const result = await client.execute({
    sql: `DELETE FROM users WHERE id = ?`,
    args: [id],
  });

  return result.rowsAffected > 0;
}
```

- [ ] **Step 1.6: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 1.7: Commit DB changes**

```bash
git add src/lib/db.ts
git commit -m "feat(db): add user CRUD functions and extend PublicUser with created_at

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: API Endpoints - POST Handler

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 2.1: Add imports and POST handler**

Replace the entire `src/app/api/admin/users/route.ts` file:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { hashPassword } from '@/lib/simple-auth';
import { getAllUsers, createUser, getUserByEmail, ROLES } from '@/lib/db';

// GET - List all users
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

// POST - Create new user
export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, github_username } = body;

    // Validation
    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return NextResponse.json(
        { error: 'Name, email, role and password are required' },
        { status: 400 }
      );
    }

    if (role !== ROLES.ADMIN && role !== ROLES.DEVELOPER) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check for existing email
    const existing = await getUserByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      github_username: github_username?.trim() || null,
    });

    // Return public user (without password)
    const { password: _, ...publicUser } = user;
    return NextResponse.json({ user: publicUser }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2.2: Verify POST handler compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2.3: Commit POST handler**

```bash
git add src/app/api/admin/users/route.ts
git commit -m "feat(api): add POST endpoint for user creation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: API Endpoints - PUT/DELETE Handler

**Files:**
- Create: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 3.1: Create [id] route directory**

Run: `mkdir -p src/app/api/admin/users/\[id\]`

- [ ] **Step 3.2: Create PUT handler**

Create file `src/app/api/admin/users/[id]/route.ts` with PUT handler:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { updateUser, deleteUser, ROLES } from '@/lib/db';

// PUT - Update user
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, role, github_username } = body;

    // Validate role if provided
    if (role !== undefined && role !== ROLES.ADMIN && role !== ROLES.DEVELOPER) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const user = await updateUser(userId, {
      name,
      email,
      role,
      github_username: github_username === '' ? null : github_username,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return public user (without password)
    const { password: _, ...publicUser } = user;
    return NextResponse.json({ user: publicUser });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3.3: Add DELETE handler to same file**

Append DELETE handler to `src/app/api/admin/users/[id]/route.ts`:

```typescript

// DELETE - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = verifyToken(token || '');
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const success = await deleteUser(userId);

    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3.4: Verify PUT/DELETE handlers compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3.5: Commit PUT/DELETE handlers**

```bash
git add src/app/api/admin/users/\[id\]/
git commit -m "feat(api): add PUT/DELETE endpoints for user management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: UserDialog Component

**Files:**
- Create: `src/components/admin/user-dialog.tsx`

- [ ] **Step 4.1: Create UserDialog with imports and types**

Create file `src/components/admin/user-dialog.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PublicUser } from '@/lib/db';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: PublicUser | null;
  onSave: (user: PublicUser) => void;
}
```

- [ ] **Step 4.2: Add component state and validation**

Append to the same file:

```typescript

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
  const isEditMode = !!user;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    github_username: '',
    role: 'developer',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          github_username: user.github_username || '',
          role: user.role,
          password: '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          github_username: '',
          role: 'developer',
          password: '',
        });
      }
      setErrors({});
    }
  }, [open, user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!isEditMode && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!isEditMode && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
```

- [ ] **Step 4.3: Add submit handler**

Append to the same file:

```typescript

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const url = isEditMode
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';

      const body = isEditMode
        ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            github_username: formData.github_username.trim() || null,
          }
        : {
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            github_username: formData.github_username.trim() || null,
            password: formData.password,
          };

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error || 'Failed to save user' });
        return;
      }

      onSave(data.user);
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4.4: Add form JSX**

Append to the same file:

```typescript

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-lg)] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span className="text-[var(--primary)]">$</span>
            {isEditMode ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono text-[var(--primary)] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              NAME *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--muted)] border-2 border-[var(--border)] rounded font-mono text-sm focus:outline-none focus:border-[var(--primary)]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            {errors.name && <p className="text-xs text-[var(--destructive)] mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-mono text-[var(--primary)] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              EMAIL *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--muted)] border-2 border-[var(--border)] rounded font-mono text-sm focus:outline-none focus:border-[var(--primary)]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            {errors.email && <p className="text-xs text-[var(--destructive)] mt-1">{errors.email}</p>}
          </div>

          {/* GitHub Username */}
          <div>
            <label className="block text-xs font-mono text-[var(--primary)] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              GITHUB USERNAME
            </label>
            <input
              type="text"
              value={formData.github_username}
              onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--muted)] border-2 border-[var(--border)] rounded font-mono text-sm focus:outline-none focus:border-[var(--primary)]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
              placeholder="optional"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-mono text-[var(--primary)] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              ROLE *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--muted)] border-2 border-[var(--border)] rounded font-mono text-sm focus:outline-none focus:border-[var(--primary)]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <option value="developer">developer</option>
              <option value="admin">admin</option>
            </select>
          </div>

          {/* Password - only for new users */}
          {!isEditMode && (
            <div>
              <label className="block text-xs font-mono text-[var(--primary)] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                PASSWORD *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border-2 border-[var(--border)] rounded font-mono text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
              {errors.password && <p className="text-xs text-[var(--destructive)] mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <p className="text-sm text-[var(--destructive)] bg-[var(--destructive)]/10 p-2 rounded border-2 border-[var(--destructive)]">
              {errors.submit}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="font-mono"
              disabled={loading}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-mono"
              disabled={loading}
            >
              {loading ? 'SAVING...' : 'SAVE'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4.5: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4.6: Commit UserDialog**

```bash
git add src/components/admin/user-dialog.tsx
git commit -m "feat(ui): add UserDialog component for add/edit operations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: UsersTab Component

**Files:**
- Create: `src/components/admin/users-tab.tsx`

- [ ] **Step 5.1: Create UsersTab with imports and state**

Create file `src/components/admin/users-tab.tsx`:

```typescript
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserDialog } from '@/components/admin/user-dialog';
import type { PublicUser } from '@/lib/db';

type SortField = 'name' | 'email' | 'role' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function UsersTab() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [userDialog, setUserDialog] = useState<{ open: boolean; user: PublicUser | null }>({ open: false, user: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: PublicUser | null }>({ open: false, user: null });
```

- [ ] **Step 5.2: Add fetch and sort logic**

Append to the same file:

```typescript

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    return [...users]
      .filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'email':
            aVal = a.email.toLowerCase();
            bVal = b.email.toLowerCase();
            break;
          case 'role':
            aVal = a.role;
            bVal = b.role;
            break;
          case 'created_at':
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [users, sortField, sortOrder, searchQuery]);
```

- [ ] **Step 5.3: Add CRUD handlers**

Append to the same file:

```typescript

  const handleSaveUser = (savedUser: PublicUser) => {
    if (userDialog.user) {
      // Edit mode - update existing
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
      toast.success(`User "${savedUser.name}" updated`);
    } else {
      // Add mode - prepend new
      setUsers(prev => [savedUser, ...prev]);
      toast.success(`User "${savedUser.name}" created`);
    }
  };

  const handleDeleteUser = async () => {
    const user = deleteConfirm.user;
    if (!user) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`User "${user.name}" deleted`);
      setDeleteConfirm({ open: false, user: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };
```

- [ ] **Step 5.4: Add loading state and header UI**

Append to the same file:

```typescript

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Users className="h-5 w-5 animate-pulse text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING USERS...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">users</span>
          <span className="text-[var(--muted-foreground)]">:: total={users.length}</span>
          <span className="text-[var(--muted-foreground)]">:: admins={users.filter(u => u.role === 'admin').length}</span>
        </div>
        <button
          onClick={() => setUserDialog({ open: true, user: null })}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-mono text-xs rounded transition-colors border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <Plus className="h-4 w-4" />
          ADD USER
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-2 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Filter by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none font-mono text-sm placeholder:text-[var(--muted-foreground)]"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-mono"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            [ESC]
          </button>
        )}
      </div>
```

- [ ] **Step 5.5: Add table UI**

Append to the same file:

```typescript

      {/* Users table */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
          <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {searchQuery ? 'No matching users found.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('name')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">NAME <SortIndicator field="name" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('email')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">EMAIL <SortIndicator field="email" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('role')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">ROLE <SortIndicator field="role" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>GITHUB</th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('created_at')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">CREATED <SortIndicator field="created_at" /></div>
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[var(--foreground)]">{user.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--primary)]/10 text-[var(--primary)] border-2 border-[var(--primary)]">
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--muted)] text-[var(--muted-foreground)] border-2 border-[var(--border)]">
                        DEVELOPER
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {user.github_username ? (
                      <code className="text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded border border-[var(--success)]/30">
                        {user.github_username}
                      </code>
                    ) : (
                      <span className="text-[var(--muted-foreground)]/50">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setUserDialog({ open: true, user })}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--primary)]"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, user })}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--destructive)]"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
```

- [ ] **Step 5.6: Add dialogs**

Append to the same file:

```typescript

      {/* User Dialog */}
      <UserDialog
        open={userDialog.open}
        onOpenChange={(open) => setUserDialog({ open, user: null })}
        user={userDialog.user}
        onSave={handleSaveUser}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, user: null })}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={
          <div className="font-mono text-sm">
            <p className="text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Are you sure you want to delete this user?</p>
            <p className="text-[var(--destructive)]">&gt; "{deleteConfirm.user?.name}" ({deleteConfirm.user?.email})</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
```

- [ ] **Step 5.7: Verify component compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5.8: Commit UsersTab**

```bash
git add src/components/admin/users-tab.tsx
git commit -m "feat(ui): add UsersTab component with table and CRUD operations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Update AdminTabs

**Files:**
- Modify: `src/components/admin/admin-tabs.tsx`

- [ ] **Step 6.1: Add Users import and update TabType**

In `src/components/admin/admin-tabs.tsx`, update imports:

```typescript
'use client';

import { useState } from 'react';
import { Database, GitBranch, Brain, Key, Trophy, Users } from 'lucide-react';
import ReposTab from '@/components/admin/repos-tab';
import MappingsTab from '@/components/admin/mappings-tab';
import AIFlagsTab from '@/components/admin/ai-flags-tab';
import KeywordsTab from '@/components/admin/keywords-tab';
import JobsTab from '@/components/admin/jobs-tab';
import UsersTab from '@/components/admin/users-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags' | 'keywords' | 'jobs' | 'users';
```

- [ ] **Step 6.2: Add Users tab config**

Update the `tabs` array:

```typescript
const tabs: TabConfig[] = [
  { id: 'repos', label: 'Repositories', icon: Database, shortcut: '1' },
  { id: 'mappings', label: 'User Mapping', icon: GitBranch, shortcut: '2' },
  { id: 'ai-flags', label: 'AI Flags', icon: Brain, shortcut: '3' },
  { id: 'keywords', label: 'Keywords', icon: Key, shortcut: '4' },
  { id: 'jobs', label: 'Jobs Report', icon: Trophy, shortcut: '5' },
  { id: 'users', label: 'Users', icon: Users, shortcut: '6' },
];
```

- [ ] **Step 6.3: Add UsersTab render**

Add to the tab content section:

```typescript
          {activeTab === 'users' && <UsersTab />}
```

- [ ] **Step 6.4: Verify changes compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6.5: Commit AdminTabs update**

```bash
git add src/components/admin/admin-tabs.tsx
git commit -m "feat(ui): add Users tab to AdminTabs with shortcut 6

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Dispatch Test Agent

- [ ] **Step 7.1: Create test task list**

After completing Tasks 1-6, use the Agent tool to dispatch a test planning agent with the following prompt:

```
Create a comprehensive automated test task list for the user management feature at docs/superpowers/plans/YYYY-MM-DD-user-management-tests.md

The feature includes:
- DB functions: createUser, updateUser, deleteUser
- API endpoints: POST/PUT/DELETE /api/admin/users
- Components: UserDialog, UsersTab
- Admin panel integration

For each test category, create bite-sized tasks with:
1. Test file path
2. Test description
3. Expected assertions

Categories to cover:
1. Unit tests for DB functions
2. API integration tests
3. Component tests (if applicable)
4. E2E tests for complete user flows
```

**Agent tool invocation:**
```
Agent tool with:
- subagent_type: general-purpose
- prompt: [above prompt]
- description: Create test task list
```

- [ ] **Step 7.2: Review and commit test plan**

After the agent creates the test plan, review it and commit:

```bash
git add docs/superpowers/plans/*-user-management-tests.md
git commit -m "docs: add automated test task list for user management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

After completing all tasks, verify the implementation:

1. **Start dev server:** `npm run dev`
2. **Login as admin** at http://localhost:3000/login
3. **Navigate to Admin Console** at http://localhost:3000/admin
4. **Click Users tab** (or press `6`)
5. **Test all operations:**
   - View user list with sorting
   - Search users by name/email
   - Add new user with all fields
   - Edit existing user
   - Delete user with confirmation
   - Verify duplicate email error
   - Verify form validation errors
