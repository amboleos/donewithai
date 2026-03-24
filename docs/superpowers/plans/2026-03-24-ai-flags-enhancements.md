# AI Flags Tab Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add commit SHA search, pagination (50 items/page), and default sort by newest first to the AI Flags tab.

**Architecture:** Single file modification to `ai-flags-tab.tsx`. Add pagination state, update default sort, extend search filter, and add pagination UI below each table.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS v4

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/admin/ai-flags-tab.tsx` | Modify | Add pagination state, SHA search, default sort, pagination UI |

---

### Task 1: Add Pagination State and Update Default Sort

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx:70-78`

- [ ] **Step 1: Add pagination state variables**

Add after line 78 (after `codeAnalysisFilter` state):

```typescript
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
```

- [ ] **Step 2: Update default sort to date/desc**

Change lines 70-71 from:
```typescript
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
```

To:
```typescript
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ai-flags): add pagination state and change default sort to date/desc"
```

---

### Task 2: Add SHA to Search Filter

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx:167-173`

- [ ] **Step 1: Add sha to the commit search filter**

Change the filter from:
```typescript
const filteredAndSortedCommits = [...commits]
  .filter(c =>
    (c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.repo_name.toLowerCase().includes(searchQuery.toLowerCase())) &&
    matchesCodeAnalysisFilter(c.is_ai_detected)
  )
```

To:
```typescript
const filteredAndSortedCommits = [...commits]
  .filter(c =>
    (c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sha.toLowerCase().includes(searchQuery.toLowerCase())) &&
    matchesCodeAnalysisFilter(c.is_ai_detected)
  )
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ai-flags): add commit SHA to search filter"
```

---

### Task 3: Add Pagination Logic

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add useEffect to reset page on filter/search change**

Add after the existing useEffect blocks (around line 91):

```typescript
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, codeAnalysisFilter, activeTab]);
```

- [ ] **Step 2: Add pagination calculations after filteredAndSortedBranches**

Add after line 224 (after `filteredAndSortedBranches` definition):

```typescript
  // Pagination calculations
  const totalCommitPages = Math.ceil(filteredAndSortedCommits.length / itemsPerPage);
  const totalBranchPages = Math.ceil(filteredAndSortedBranches.length / itemsPerPage);

  const paginatedCommits = filteredAndSortedCommits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedBranches = filteredAndSortedBranches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ai-flags): add pagination calculation logic"
```

---

### Task 4: Add Pagination UI Component

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add Pagination component helper**

Add before the `AIFlagsTab` component definition (around line 64):

```typescript
// Pagination component
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t-2 border-[var(--border)] bg-[var(--muted)]">
      <div className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-xs font-mono rounded border-2 border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card)] transition-colors"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          &lt; PREV
        </button>
        {getPageNumbers().map((page, idx) => (
          typeof page === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-xs font-mono rounded border-2 transition-colors ${
                currentPage === page
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'border-[var(--border)] hover:bg-[var(--card)]'
              }`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-2 text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {page}
            </span>
          )
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-xs font-mono rounded border-2 border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--card)] transition-colors"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          NEXT &gt;
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update commits table to use paginatedCommits**

Change line 518 from:
```typescript
                  {filteredAndSortedCommits.map((commit) => (
```

To:
```typescript
                  {paginatedCommits.map((commit) => (
```

- [ ] **Step 3: Update branches table to use paginatedBranches**

Change line 629 from:
```typescript
                  {filteredAndSortedBranches.map((branch) => (
```

To:
```typescript
                  {paginatedBranches.map((branch) => (
```

- [ ] **Step 4: Add Pagination UI after commits table**

Add after the commits table closing `</div>` (around line 596, before the branches section):

```typescript
        {/* Commits Pagination */}
        {filteredAndSortedCommits.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalCommitPages}
            totalItems={filteredAndSortedCommits.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
```

- [ ] **Step 5: Add Pagination UI after branches table**

Add after the branches table closing `</div>` (around line 681, before the Commit Message Modal):

```typescript
        {/* Branches Pagination */}
        {filteredAndSortedBranches.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalBranchPages}
            totalItems={filteredAndSortedBranches.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ai-flags): add pagination UI component"
```

---

### Task 5: Manual Testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test SHA search**
1. Navigate to `/admin` → AI Flags tab
2. Copy a commit SHA from the table
3. Paste into search box
4. Verify: Only that commit appears
5. Test partial SHA (first 7 chars) - should also match

- [ ] **Step 3: Test default sort**
1. Refresh the page
2. Verify: Commits are sorted by date, newest first
3. Check the DATE column - most recent dates should be at top

- [ ] **Step 4: Test pagination**
1. If you have 50+ commits, verify pagination appears
2. Click "NEXT >" - should show next 50 items
3. Click page numbers - should navigate correctly
4. Verify "Showing X-Y of Z" text is accurate

- [ ] **Step 5: Test page reset on filter change**
1. Go to page 2
2. Type in search box
3. Verify: Returns to page 1
4. Clear search, go to page 2 again
5. Change CODE filter (e.g., to "AGENTIC")
6. Verify: Returns to page 1

- [ ] **Step 6: Test on repo detail page**
1. Navigate to `/repo/[id]` for a repo with commits
2. Repeat tests 2-5 to verify pagination works in repo-specific view

---

### Task 6: Final Commit

- [ ] **Step 1: Create summary commit if needed**

If any additional fixes were made:

```bash
git add -A
git commit -m "fix(ai-flags): finalize pagination and search enhancements"
```
