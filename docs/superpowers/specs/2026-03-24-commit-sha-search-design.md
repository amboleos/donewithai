# AI Flags Tab Enhancements

## Summary
Three enhancements to the AI Flags tab:
1. **Commit SHA search** - Search commits by their hash
2. **Pagination** - Page-based navigation with 50 items per page
3. **Default sort** - Newest items first on initial load

## Problem
- Users cannot search for commits by SHA hash
- Large datasets cause performance issues (all items loaded at once)
- Default sort by name is not intuitive - users expect newest first

## Solution

### 1. Commit SHA Search
Add `sha` field to the existing search filter logic.

### 2. Pagination System
- 50 items per page
- Page number navigation (1, 2, 3, ... Next/Prev)
- Reset to page 1 when search/filter changes

### 3. Default Sort
Change default sort from `name/asc` to `date/desc` (newest first).

## Technical Changes

### File: `src/components/admin/ai-flags-tab.tsx`

#### 1. Add Pagination State
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(50);
```

#### 2. Update Default Sort (line 70-71)
```typescript
// Before
const [sortField, setSortField] = useState<SortField>('name');
const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

// After
const [sortField, setSortField] = useState<SortField>('date');
const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
```

#### 3. Add SHA to Search Filter (line 167-173)
```typescript
const filteredAndSortedCommits = [...commits]
  .filter(c =>
    (c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sha.toLowerCase().includes(searchQuery.toLowerCase())) &&  // NEW
    matchesCodeAnalysisFilter(c.is_ai_detected)
  )
  // ... sort logic
```

#### 4. Paginate Results
```typescript
const paginatedCommits = filteredAndSortedCommits.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

const totalPages = Math.ceil(filteredAndSortedCommits.length / itemsPerPage);
```

#### 5. Reset Page on Filter/Search Change
```typescript
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, codeAnalysisFilter, activeTab]);
```

#### 6. Add Pagination UI Component
Add pagination controls below the table:
- Previous button
- Page numbers (smart ellipsis for large page counts)
- Next button
- Item count display (e.g., "Showing 1-50 of 234")

### Pagination Component UI
```
[< PREV]  [1] [2] [3] ... [10]  [NEXT >]   Showing 1-50 of 487
```

## Impact
- **Affected pages:** Admin page (`/admin`), Repo detail page (`/repo/[id]`)
- **Breaking changes:** None
- **Migration required:** No

## Testing
1. **SHA Search:** Search for a known commit SHA, verify match
2. **Partial SHA:** Verify `abc123` matches `abc123def456...`
3. **Pagination:** Verify 50 items per page, navigation works
4. **Page Reset:** Change search/filter, verify returns to page 1
5. **Default Sort:** Fresh load shows newest commits first
