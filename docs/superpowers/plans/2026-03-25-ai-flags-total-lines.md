# AI Flags Total Line Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display total line changes (+/-) summary in the AI Flags commits list to show aggregate statistics when data is available.

**Architecture:** Add a summary section above the commits table that calculates and displays total `lines_added` and `lines_removed` from the filtered commits. This provides users with quick insight into the overall code change volume.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4

---

## Files to Modify

| File | Purpose |
|------|---------|
| `src/components/admin/ai-flags-tab.tsx` | Add total line changes calculation and display |

---

### Task 1: Add Total Line Changes Summary to AI Flags Tab

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx:300-320` (after filteredAndSortedCommits definition)

- [ ] **Step 1: Add total line changes calculation**

Add after the `filteredAndSortedCommits` useMemo/definition (around line 299):

```typescript
// Calculate total line changes from filtered commits
const totalLineChanges = filteredAndSortedCommits.reduce(
  (acc, commit) => ({
    added: acc.added + (commit.lines_added || 0),
    removed: acc.removed + (commit.lines_removed || 0),
  }),
  { added: 0, removed: 0 }
);

// Check if any commit has line data (to show "calculating" state)
const hasLineData = filteredAndSortedCommits.some(
  (c) => c.lines_added > 0 || c.lines_removed > 0
);
```

- [ ] **Step 2: Add summary display component**

Add a summary bar above the commits table (after the filter tabs, around line 590):

```tsx
{/* Total Line Changes Summary */}
{filteredAndSortedCommits.length > 0 && (
  <div className="px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
    <div className="flex items-center gap-4">
      <span className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        TOTAL CHANGES ({filteredAndSortedCommits.length} commits):
      </span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-mono font-bold text-green-600 dark:text-green-400">
          <Plus className="h-4 w-4" />
          {totalLineChanges.added.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-sm font-mono font-bold text-red-600 dark:text-red-400">
          <Minus className="h-4 w-4" />
          {totalLineChanges.removed.toLocaleString()}
        </span>
      </div>
    </div>
    {!hasLineData && (
      <span className="text-xs font-mono text-[var(--muted-foreground)] italic" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        (diffstat pending - run sync to calculate)
      </span>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify the Plus and Minus icons are imported**

The icons are already imported at line 5:
```typescript
import { GitBranch, RefreshCw, GitCommit, ChevronDown, ChevronUp, Search, Sparkles, Loader2, Code2, User, Plus, Minus, XCircle, Brain, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
```

No changes needed - `Plus` and `Minus` are already imported.

- [ ] **Step 4: Run development server to verify**

Run: `npm run dev`

Expected: Dev server starts without errors

- [ ] **Step 5: Test the UI manually**

1. Navigate to `/admin` → AI Flags tab
2. Verify total line changes summary appears above commits table
3. Verify the summary shows correct totals
4. Verify "diffstat pending" message appears when line data is 0

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ai-flags): add total line changes summary to commits list

- Display aggregate +/- line totals above commits table
- Show pending state when diffstat not yet calculated
- Help users understand overall code change volume at a glance"
```

---

## Testing Checklist

- [ ] Total line changes displays correctly for filtered commits
- [ ] "diffstat pending" message shows when no line data available
- [ ] Numbers format with locale separators (e.g., 1,234)
- [ ] Summary updates when filters change (search, AI detection filter)
- [ ] Summary updates when switching between commits/branches tabs
- [ ] Responsive layout works on smaller screens
