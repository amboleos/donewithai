# AI Flags Branch-Based Reorganization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize AI Flags table to show only default branch commits in "Commits" tab and non-default branch commits under their respective branches in "Branches" tab.

**Architecture:**
- Modify API to filter commits by branch membership (default vs non-default)
- Expand branches API to include commits for each branch
- Update UI to make branches expandable with nested commits

**Tech Stack:** Next.js API Routes, Turso DB, React useState, Tailwind CSS

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/admin/all/route.ts` | Restructure query to return default-branch-only commits + branches with their commits |
| `src/components/admin/ai-flags-tab.tsx` | Add expandable branches UI with nested commits |
| `src/lib/db.ts` | Add helper function to get commits by branch (already exists: `getCommitsByBranchId`) |

---

## Database Query Logic

**Default branch detection:** Branch name is `master` or `main`

**New API Response Structure:**
```typescript
{
  commits: Commit[],  // Only commits from default branch (master/main)
  branches: Array<Branch & {
    commits: Commit[]  // Commits belonging to this non-default branch
  }>
}
```

---

### Task 1: Modify API to Return Branch-Organized Data

**Files:**
- Modify: `src/app/api/admin/all/route.ts`

- [ ] **Step 1: Update commits query to filter by default branch**

Replace the commits query to only include commits from default branches (master/main):

```typescript
// Fetch commits only from default branches (master/main)
const commitsResult = await client.execute({
  sql: `
    SELECT DISTINCT
      c.id,
      c.sha,
      c.message,
      c.author,
      c.repo_id,
      c.date,
      c.lines_added,
      c.lines_removed,
      r.name as repo_name,
      c.is_ai_detected
    FROM commits c
    JOIN repos r ON c.repo_id = r.id
    JOIN branch_commits bc ON c.id = bc.commit_id
    JOIN branches b ON bc.branch_id = b.id
    WHERE c.date >= ? AND (b.name = 'master' OR b.name = 'main')
    ORDER BY c.date DESC
  `,
  args: [AI_CUTOFF_DATE],
});
```

- [ ] **Step 2: Update branches query to include commits for each branch**

Replace the branches query to include commits nested:

```typescript
// Fetch non-default branches (excluding master/main)
const branchesResult = await client.execute({
  sql: `
    SELECT DISTINCT
      b.id,
      b.name,
      b.repo_id,
      r.name as repo_name,
      b.is_ai_detected
    FROM branches b
    JOIN repos r ON b.repo_id = r.id
    JOIN branch_commits bc ON b.id = bc.branch_id
    JOIN commits c ON bc.commit_id = c.id
    WHERE c.date >= ? AND b.name != 'master' AND b.name != 'main'
    ORDER BY b.name
  `,
  args: [AI_CUTOFF_DATE],
});

// For each branch, fetch its commits
const branchesWithCommits = await Promise.all(
  branchesResult.rows.map(async (branch) => {
    const branchCommits = await client.execute({
      sql: `
        SELECT
          c.id,
          c.sha,
          c.message,
          c.author,
          c.repo_id,
          c.date,
          c.lines_added,
          c.lines_removed,
          c.is_ai_detected
        FROM commits c
        JOIN branch_commits bc ON c.id = bc.commit_id
        WHERE bc.branch_id = ? AND c.date >= ?
        ORDER BY c.date DESC
      `,
      args: [branch.id, AI_CUTOFF_DATE],
    });
    return {
      ...branch,
      commits: branchCommits.rows,
    };
  })
);
```

- [ ] **Step 3: Update response to use branchesWithCommits**

```typescript
return NextResponse.json({
  commits: commitsResult.rows,
  branches: branchesWithCommits,
});
```

- [ ] **Step 4: Commit API changes**

```bash
git add src/app/api/admin/all/route.ts
git commit -m "feat: reorganize AI Flags API to separate default branch commits from branch commits"
```

---

### Task 2: Update TypeScript Interfaces

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Update Branch interface to include commits**

```typescript
interface Branch {
  id: number;
  name: string;
  repo_id: number;
  repo_name: string;
  is_ai_detected: number | null;
  commits: Commit[];  // Add this line
}
```

- [ ] **Step 2: Add expanded branch state**

Add new state after existing useState declarations (around line 72):

```typescript
const [expandedBranches, setExpandedBranches] = useState<Set<number>>(new Set());
```

- [ ] **Step 3: Commit interface changes**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat: add commits to Branch interface and expanded state for AI Flags"
```

---

### Task 3: Update Branches Tab UI with Expandable Commits

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add toggle function for branch expansion**

Add after the `toggleAI` function (around line 241):

```typescript
const toggleBranchExpand = (branchId: number) => {
  setExpandedBranches(prev => {
    const newSet = new Set(prev);
    if (newSet.has(branchId)) {
      newSet.delete(branchId);
    } else {
      newSet.add(branchId);
    }
    return newSet;
  });
};
```

- [ ] **Step 2: Update branches table to be expandable**

Find the branches table in the JSX (search for "Branches" tab content). Replace the entire branches table section with:

```tsx
{/* Branches Tab */}
{activeTab === 'branches' && (
  <div className="space-y-2">
    {filteredAndSortedBranches.map((branch) => {
      const isExpanded = expandedBranches.has(branch.id);
      const branchCommits = branch.commits || [];
      return (
        <div key={branch.id} className="border rounded-lg overflow-hidden">
          {/* Branch Header Row */}
          <div
            className="flex items-center gap-4 p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleBranchExpand(branch.id)}
          >
            <button className="p-1 hover:bg-muted rounded">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{branch.name}</div>
              <div className="text-sm text-muted-foreground">
                {branch.repo_name} • {branchCommits.length} commits
              </div>
            </div>
            <AIDetectionBadge isAIDetected={branch.is_ai_detected} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  analyzeCode(branch.repo_id, 'branch', branch.id);
                }}
                disabled={analyzingId === branch.id}
              >
                {analyzingId === branch.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAI('branch', branch.id, branch.is_ai_detected === 1);
                }}
              >
                {branch.is_ai_detected === 1 ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {branch.is_ai_detected === 1 ? 'Remove AI' : 'Mark AI'}
              </Button>
            </div>
          </div>

          {/* Expanded Commits List */}
          {isExpanded && branchCommits.length > 0 && (
            <div className="border-t bg-background">
              <table className="w-full">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Commit</th>
                    <th className="text-left p-3 text-sm font-medium">Author</th>
                    <th className="text-left p-3 text-sm font-medium">Date</th>
                    <th className="text-left p-3 text-sm font-medium">Lines</th>
                    <th className="text-left p-3 text-sm font-medium">AI Status</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchCommits.map((commit) => (
                    <tr key={commit.id} className="border-t hover:bg-muted/10">
                      <td className="p-3">
                        <div className="max-w-md">
                          <div className="font-mono text-xs text-muted-foreground mb-1">
                            {commit.sha.slice(0, 7)}
                          </div>
                          <div className="truncate text-sm">{commit.message}</div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{commit.author}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(commit.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm">
                        <span className="text-green-600">+{commit.lines_added}</span>
                        {' / '}
                        <span className="text-red-600">-{commit.lines_removed}</span>
                      </td>
                      <td className="p-3">
                        <AIDetectionBadge isAIDetected={commit.is_ai_detected} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => analyzeCode(branch.repo_id, 'commit', commit.id)}
                            disabled={analyzingId === commit.id}
                          >
                            {analyzingId === commit.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAI('commit', commit.id, commit.is_ai_detected === 1)}
                          >
                            {commit.is_ai_detected === 1 ? (
                              <Minus className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    })}
  </div>
)}
```

- [ ] **Step 3: Commit UI changes**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat: add expandable branches with nested commits in AI Flags tab"
```

---

### Task 4: Test the Changes

- [ ] **Step 1: Start dev server and verify**

```bash
npm run dev
```

Navigate to:
1. `/admin` → AI Flags tab → Verify "Commits" shows only master/main commits
2. Verify "Branches" shows non-default branches
3. Click on a branch to expand and see nested commits

- [ ] **Step 2: Final commit if needed**

```bash
git add -A
git commit -m "fix: any remaining issues from testing"
```

---

## Summary

This plan reorganizes the AI Flags table to:
1. **Commits tab**: Shows only commits from default branches (master/main)
2. **Branches tab**: Shows non-default branches as expandable cards with their commits nested inside

The change is purely in the API query logic and UI presentation - no database schema changes required.
