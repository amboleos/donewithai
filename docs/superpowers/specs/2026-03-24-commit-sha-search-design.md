# Commit SHA Search in AI Flags Tab

## Summary
Add commit SHA (hash) to the searchable fields in the AI Flags tab, allowing users to find commits by their commit number.

## Problem
Users cannot search for commits by their SHA hash in the AI Flags tab. The current search only filters by:
- Commit message
- Author name
- Repository name

## Solution
Add the `sha` field to the existing search filter logic in `filteredAndSortedCommits`.

## Technical Changes

### File: `src/components/admin/ai-flags-tab.tsx`

**Current filter (line 167-173):**
```typescript
const filteredAndSortedCommits = [...commits]
  .filter(c =>
    (c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.repo_name.toLowerCase().includes(searchQuery.toLowerCase())) &&
    matchesCodeAnalysisFilter(c.is_ai_detected)
  )
```

**Updated filter:**
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

## Impact
- **Affected pages:** Admin page (`/admin`), Repo detail page (`/repo/[id]`)
- **Breaking changes:** None
- **Migration required:** No

## Testing
- Manual verification: Search for a known commit SHA in the AI Flags tab
- Verify partial SHA matches work (e.g., `abc123` matches `abc123def456...`)
