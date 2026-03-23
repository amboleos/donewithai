# User Management Tab Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full CRUD user management tab to the admin panel.

**Architecture:** New `UsersTab` component following existing tab patterns, with `UserDialog` for add/edit operations. Backend extends existing `/api/admin/users` endpoint and adds new `/api/admin/users/[id]` route for update/delete operations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Turso DB, shadcn/ui, sonner for toasts

---

## 1. Architecture

**New files:**
- `src/components/admin/users-tab.tsx` - Main tab component (table + CRUD operations)
- `src/components/admin/user-dialog.tsx` - Add/edit dialog form
- `src/app/api/admin/users/route.ts` - Add POST to existing GET
- `src/app/api/admin/users/[id]/route.ts` - PUT and DELETE endpoints

**Modified files:**
- `src/components/admin/admin-tabs.tsx` - Add new "Users" tab (shortcut: `6`)
- `src/lib/db.ts` - Add `updateUser`, `deleteUser`, `createUser` functions

**Data flow:**
```
UsersTab → GET /api/admin/users → getAllUsers() (existing)
UsersTab → UserDialog → POST /api/admin/users → createUser()
UsersTab → UserDialog → PUT /api/admin/users/[id] → updateUser()
UsersTab → ConfirmDialog → DELETE /api/admin/users/[id] → deleteUser()
```

---

## 2. Component Design

### Types

```typescript
// PublicUser type - EXTEND existing interface in db.ts to add created_at
interface PublicUser {
  id: number;
  name: string;
  email: string;
  github_username: string | null;
  role: string;
  created_at: string;  // ADD THIS FIELD
}

// UserDialog props
interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: PublicUser | null;  // null/undefined = add mode, otherwise edit mode
  onSave: (user: PublicUser) => void;
}
```

### UsersTab
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Add User]                                    🔍 Search  │
├─────────────────────────────────────────────────────────────┤
│ Name       │ Email          │ Role    │ GitHub    │ Created │ Actions │
├─────────────────────────────────────────────────────────────┤
│ John Doe   │ john@mail.com  │ admin   │ johndoe   │ Mar 20  │ ✏️ 🗑️  │
│ Jane Smith │ jane@mail.com  │ dev     │ janesmith │ Mar 21  │ ✏️ 🗑️  │
└─────────────────────────────────────────────────────────────┘
```

- **Sorting:** By name, email, role, created_at fields
- **Search:** Filter by name and email
- **Actions:** Edit (✏️) and Delete (🗑️) buttons at row end
- **Tab shortcut:** `6` (following existing 1-5 pattern)

### UserDialog
```
┌─────────────────────────────────────────┐
│  Add New User                    [X]    │
├─────────────────────────────────────────┤
│  Name *          │ _________________   │
│  Email *         │ _________________   │
│  GitHub Username │ _________________   │
│  Role *          │ [admin ▼]           │
│  Password *      │ _________________   │
│                                         │
│        [Cancel]  [Save]                 │
└─────────────────────────────────────────┘
```
- Edit mode: Password field not shown (only for new users)
- Required fields: Name, Email, Role, Password (for new users)
- **Password update is out of scope** - separate feature if needed

---

## 3. API Design

**Authentication pattern:** Use `verifyToken` from `simple-auth.ts` directly (same as existing `/api/admin/users/route.ts`).

### `POST /api/admin/users` - Create user
```typescript
// Request
{ name: string, email: string, github_username?: string, role: 'admin' | 'developer', password: string }

// Response 201
{ user: PublicUser }

// Response 400 - Email exists
{ error: 'Email already exists' }

// Response 400 - Missing fields
{ error: 'Name, email, role and password are required' }

// Response 403 - Not admin
{ error: 'Forbidden' }
```

### `PUT /api/admin/users/[id]` - Update user
```typescript
// Request
{ name?: string, email?: string, github_username?: string | null, role?: 'admin' | 'developer' }

// Response 200
{ user: PublicUser }

// Response 404
{ error: 'User not found' }

// Response 403 - Not admin
{ error: 'Forbidden' }
```

### `DELETE /api/admin/users/[id]` - Delete user
```typescript
// Response 200
{ success: true }

// Response 404
{ error: 'User not found' }

// Response 403 - Not admin
{ error: 'Forbidden' }
```

---

## 4. Database Changes

Functions to add in `src/lib/db.ts`:

```typescript
// Create user - receives PRE-HASHED password from API route
export async function createUser(data: {
  name: string;
  email: string;
  password: string;  // Already hashed with hashPassword() in API route
  role: string;
  github_username?: string | null;
}): Promise<User>

// Update user
export async function updateUser(id: number, data: {
  name?: string;
  email?: string;
  role?: string;
  github_username?: string | null;
}): Promise<User | null>

// Delete user
export async function deleteUser(id: number): Promise<boolean>
```

**Notes:**
- **Password hashing:** Done in API route using `hashPassword()` from `simple-auth.ts` before passing to DB
- **`getUserByEmail`:** Already exists in db.ts (returns `Promise<User | undefined>`) - use existing function
- **`github_username` normalization:** Normalize to lowercase (consistent with existing `createUserMapping` pattern)
- **`getAllUsers()` modification:** Add `created_at` to SELECT query and update `PublicUser` interface
- **No schema changes** - Existing `users` table is sufficient

---

## 5. Error Handling

| Scenario | Handling |
|----------|----------|
| Email already registered | 400: "Email already exists" |
| User not found | 404: "User not found" |
| Invalid role | 400: "Invalid role" |
| Missing required field | 400: "Name, email, role and password are required" |
| Unauthorized access | 403: "Forbidden" (using verifyToken pattern) |
| DB error | 500: "Internal server error" + toast |

**Edge cases (intentionally allowed per requirements):**
- Admin can delete their own account (no restriction)
- Admin can demote themselves (even if last admin)
- Admin can delete the last admin

**Client-side:**
- Form validation: Inline error messages for empty required fields
- Toast notifications: Success/failure messages (using existing `sonner`)

---

## 6. Testing

**Manual test scenarios:**
1. Load user list and test sorting
2. Add new user (all fields)
3. Add with duplicate email (expect error)
4. Edit user (name, email, role, github_username)
5. Delete user with confirmation dialog
6. Search/filter functionality
7. Non-admin access (expect 403)
8. Self-deletion (should succeed)
9. Self-demotion (should succeed)

**Automated test:** Last task will dispatch a separate agent to create the automated test task list.

---

## 7. Task List

| # | Task | Files |
|---|------|-------|
| 1 | Add DB functions (`createUser`, `updateUser`, `deleteUser`) + extend `PublicUser` + update `getAllUsers()` | `src/lib/db.ts` |
| 2 | Add API endpoints (POST, PUT, DELETE) | `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts` |
| 3 | Create `UserDialog` component | `src/components/admin/user-dialog.tsx` |
| 4 | Create `UsersTab` component | `src/components/admin/users-tab.tsx` |
| 5 | Update `AdminTabs` (add new tab with shortcut 6) | `src/components/admin/admin-tabs.tsx` |
| 6 | Dispatch test agent for automated test task list | - |
