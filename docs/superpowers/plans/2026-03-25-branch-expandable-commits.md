# Branch Expandable Commits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expandable accordion UI to branches table in AI Flags page, showing commits belonging to each branch with analyze functionality and analysis popup.

**Architecture:** Extend existing `ai-flags-tab.tsx` with expandable branch rows. Add API endpoint to fetch commits for a specific branch. Reuse existing analysis modal pattern for branch analysis popup.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Turso DB

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/repos/[id]/branches/[branchId]/commits/route.ts` | Create | API endpoint for fetching commits of a branch |
| `src/lib/db.ts` | Modify | Add `getCommitsForBranch()` helper |
| `src/components/admin/ai-flags-tab.tsx` | Modify | Add expandable branches UI, branch modal, analyze button |

---

### Task 1: Add Database Helper for Branch Commits

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Add `getCommitsForBranch` function**

Add after existing branch-related functions (around line 620):

```typescript
export async function getCommitsForBranch(branchId: number): Promise<(Commit & { repo_name: string })[]> {
  const result = await client.execute({
    sql: `
      SELECT c.*, r.name as repo_name
      FROM commits c
      JOIN branch_commits bc ON c.id = bc.commit_id
      JOIN repos r ON c.repo_id = r.id
      WHERE bc.branch_id = ?
      ORDER BY c.date DESC
    `,
    args: [branchId],
  });
  return result.rows as unknown as (Commit & { repo_name: string })[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): add getCommitsForBranch helper function"
```

---

### Task 2: Create API Endpoint for Branch Commits

**Files:**
- Create: `src/app/api/repos/[id]/branches/[branchId]/commits/route.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/app/api/repos/\[id\]/branches/\[branchId\]/commits
```

- [ ] **Step 2: Create the API route handler**

```typescript
// src/app/api/repos/[id]/branches/[branchId]/commits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCommitsForBranch } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const commits = await getCommitsForBranch(parseInt(branchId));
    return NextResponse.json({ commits });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/repos/\[id\]/branches/\[branchId\]/
git commit -m "feat(api): add branch commits endpoint"
```

---

### Task 3: Add Expandable Branches UI

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add state variables for expanded branches and branch modal**

Add after existing state declarations (around line 73):

```typescript
// Branch expansion state
const [expandedBranches, setExpandedBranches] = useState<Set<number>>(new Set());
const [branchCommits, setBranchCommits] = useState<Record<number, Commit[]>>({});
const [loadingBranchCommits, setLoadingBranchCommits] = useState<number | null>(null);

// Branch analysis modal state
const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
const [branchAnalyses, setBranchAnalyses] = useState<Record<number, CodeAnalysisResult>>({});
const [loadingBranchAnalysis, setLoadingBranchAnalysis] = useState<number | null>(null);
```

- [ ] **Step 2: Add imports**

Update imports at the top to include `ChevronRight`:

```typescript
import { GitBranch, RefreshCw, GitCommit, ChevronDown, ChevronUp, ChevronRight, Search, Sparkles, Loader2, Code2, User, Plus, Minus, XCircle, Brain, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
```

- [ ] **Step 3: Add toggle and fetch functions**

Add after `handleSelectCommit` function (around line 330):

```typescript
// Toggle branch expansion
const toggleBranchExpand = async (branch: Branch) => {
  const branchId = branch.id;

  if (expandedBranches.has(branchId)) {
    // Collapse
    setExpandedBranches(prev => {
      const next = new Set(prev);
      next.delete(branchId);
      return next;
    });
  } else {
    // Expand and fetch commits if not cached
    setExpandedBranches(prev => new Set(prev).add(branchId));

    if (!branchCommits[branchId]) {
      setLoadingBranchCommits(branchId);
      try {
        const res = await fetch(`/api/repos/${branch.repo_id}/branches/${branchId}/commits`);
        if (res.ok) {
          const data = await res.json();
          setBranchCommits(prev => ({
            ...prev,
            [branchId]: data.commits || []
          }));
        } else {
          toast.error('Failed to fetch branch commits');
        }
      } catch (error) {
        toast.error('Failed to fetch branch commits');
      } finally {
        setLoadingBranchCommits(null);
      }
    }
  }
};

// Fetch branch analysis
const fetchBranchAnalysis = async (branchId: number, repoId: number) => {
  if (branchAnalyses[branchId]) return;

  setLoadingBranchAnalysis(branchId);
  try {
    const res = await fetch(`/api/ai/code-analysis?repoId=${repoId}&sourceType=branch&sourceId=${branchId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.analysis) {
        setBranchAnalyses(prev => ({
          ...prev,
          [branchId]: data.analysis
        }));
      }
    }
  } catch (error) {
    // Silently fail - analysis may not exist
  } finally {
    setLoadingBranchAnalysis(null);
  }
};

// Handle branch selection for modal
const handleSelectBranch = (branch: Branch) => {
  setSelectedBranch(branch);
  fetchBranchAnalysis(branch.id, branch.repo_id);
};
```

- [ ] **Step 4: Update Branch interface to include commits count (optional enhancement)**

No change needed - we'll show count from fetched data.

- [ ] **Step 5: Replace Branches Table with expandable version**

Replace the entire `{activeTab === 'branches' && (...)}` section (lines 602-685) with:

```tsx
      {/* Branches Table */}
      {activeTab === 'branches' && (
        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden">
          {filteredAndSortedBranches.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {searchQuery ? 'No matching branches found.' : 'No branches to manage. Add repositories first.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--muted)]">
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="px-2 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('name')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                      <div className="flex items-center gap-1">NAME <SortIndicator field="name" /></div>
                    </th>
                    {!repoId && (
                      <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('repo')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                        <div className="flex items-center gap-1">REPO <SortIndicator field="repo" /></div>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>COMMITS</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>CODE ANALYSIS</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTION</th>
                    )}
                  </tr>
                </thead>
                <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {filteredAndSortedBranches.map((branch) => {
                    const isExpanded = expandedBranches.has(branch.id);
                    const commits = branchCommits[branch.id] || [];
                    const isLoading = loadingBranchCommits === branch.id;

                    return (
                      <React.Fragment key={branch.id}>
                        {/* Branch Row */}
                        <tr
                          className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                          onClick={() => handleSelectBranch(branch)}
                        >
                          {/* Expand Button */}
                          <td className="px-2 py-3 w-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBranchExpand(branch);
                              }}
                              className="p-1 hover:bg-[var(--muted)] rounded transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                              ) : isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-[var(--primary)]" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                              )}
                            </button>
                          </td>
                          {/* Branch Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                              <span className="text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>{branch.name}</span>
                            </div>
                          </td>
                          {/* Repo */}
                          {!repoId && (
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{branch.repo_name}</td>
                          )}
                          {/* Commits Count */}
                          <td className="px-4 py-3 text-[var(--muted-foreground)] font-mono text-xs">
                            {isLoading ? '...' : commits.length > 0 ? `${commits.length}` : '-'}
                          </td>
                          {/* Code Analysis Badge */}
                          <td className="px-4 py-3">
                            <AIDetectionBadge isAIDetected={branch.is_ai_detected} />
                          </td>
                          {/* Actions */}
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                {/* View Analysis Button (if exists) */}
                                {branchAnalyses[branch.id] && (
                                  <button
                                    onClick={() => handleSelectBranch(branch)}
                                    title="View analysis report"
                                    className="px-2 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1 border-2 bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)] hover:bg-[var(--primary)]/20"
                                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                  >
                                    <FileText className="h-3 w-3" />
                                    VIEW
                                  </button>
                                )}
                                {/* Analyze Button */}
                                <button
                                  onClick={() => analyzeCode(branch.repo_id, 'branch', branch.id)}
                                  disabled={analyzingId === branch.id}
                                  title="Analyze code for AI patterns"
                                  className={`
                                    px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1 border-2
                                    ${analyzingId === branch.id
                                      ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)] cursor-wait'
                                      : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)] hover:bg-[var(--warning)]/20'
                                    }
                                  `}
                                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                >
                                  {analyzingId === branch.id ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      ANALYZING
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-3 w-3" />
                                      ANALYZE
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expanded Commits Row */}
                        {isExpanded && (
                          <tr className="bg-[var(--muted)]/30">
                            <td colSpan={isAdmin ? 6 : 5} className="p-0">
                              <div className="p-3 pl-12 border-t border-[var(--border)]">
                                {isLoading ? (
                                  <div className="flex items-center gap-2 py-4 text-[var(--muted-foreground)]">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="font-mono text-sm">Loading commits...</span>
                                  </div>
                                ) : commits.length === 0 ? (
                                  <div className="py-4 text-center text-[var(--muted-foreground)] font-mono text-sm">
                                    No commits found for this branch
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-xs font-mono text-[var(--muted-foreground)] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                      COMMITS IN THIS BRANCH ({commits.length})
                                    </div>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                      {commits.map((commit) => (
                                        <div
                                          key={commit.id}
                                          className="flex items-center justify-between p-2 border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-sm)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                          onClick={() => handleSelectCommit(commit)}
                                        >
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-1 shrink-0">
                                              <GitCommit className="h-3 w-3 text-[var(--muted-foreground)]" />
                                              <span className="font-mono text-xs text-[var(--muted-foreground)]">{commit.sha.substring(0, 7)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm text-[var(--foreground)] truncate" style={{ fontFamily: 'Sora, sans-serif' }}>{commit.message.split('\n')[0]}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <span className="text-xs text-[var(--muted-foreground)]">{commit.author}</span>
                                              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                                                {commit.date ? new Date(commit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-mono text-green-600 dark:text-green-400">+{commit.lines_added || 0}</span>
                                            <span className="text-xs font-mono text-red-600 dark:text-red-400">-{commit.lines_removed || 0}</span>
                                            <AIDetectionBadge isAIDetected={commit.is_ai_detected} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 6: Add React import**

Add `React` to imports if not already present:

```typescript
import React, { useEffect, useState } from 'react';
```

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ui): add expandable branches with commits in AI flags tab"
```

---

### Task 4: Add Branch Analysis Modal

**Files:**
- Modify: `src/components/admin/ai-flags-tab.tsx`

- [ ] **Step 1: Add Branch Analysis Modal after Commit Modal**

Add after the closing of `{selectedCommit && (...)}` section (around line 950):

```tsx
      {/* Branch Analysis Modal */}
      {selectedBranch && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBranch(null)}
        >
          <div
            className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--muted)]">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                <span className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedBranch.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedBranch(null)}
                className="p-1 hover:bg-[var(--muted)] rounded transition-colors"
              >
                <XCircle className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-60px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    BRANCH NAME
                  </label>
                  <p className="mt-1 text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>{selectedBranch.name}</p>
                </div>
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    REPO
                  </label>
                  <p className="mt-1 text-[var(--muted-foreground)]">{selectedBranch.repo_name}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  CODE ANALYSIS
                </label>
                <div className="mt-1">
                  <AIDetectionBadge isAIDetected={selectedBranch.is_ai_detected} />
                </div>
              </div>

              {/* Loading Analysis */}
              {loadingBranchAnalysis === selectedBranch.id && (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)] py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-mono text-sm">Loading analysis...</span>
                </div>
              )}

              {/* Analysis Details */}
              {branchAnalyses[selectedBranch.id] && (
                <div className="border-t-2 border-[var(--border)] pt-4 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {branchAnalyses[selectedBranch.id].isAgentic ? (
                        <div className="p-2 border-2 border-[var(--destructive)] bg-[var(--destructive)]/10 [box-shadow:var(--shadow-brutal-sm)]">
                          <Brain className="h-4 w-4 text-[var(--destructive)]" />
                        </div>
                      ) : (
                        <div className="p-2 border-2 border-[var(--success)] bg-[var(--success)]/10 [box-shadow:var(--shadow-brutal-sm)]">
                          <User className="h-4 w-4 text-[var(--success)]" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {branchAnalyses[selectedBranch.id].isAgentic ? 'AGENTIC AI DETECTED' : 'HUMAN'}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono">
                          {branchAnalyses[selectedBranch.id].model} - {branchAnalyses[selectedBranch.id].durationMs ? `${(branchAnalyses[selectedBranch.id].durationMs! / 1000).toFixed(1)}s` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-[var(--foreground)]">{Math.round(branchAnalyses[selectedBranch.id].confidence * 100)}%</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">confidence</div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)]">
                    <h4 className="text-xs font-bold text-[var(--primary)] font-mono mb-1 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                      <FileText className="h-3 w-3" />
                      SUMMARY
                    </h4>
                    <p className="text-[var(--foreground)] text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {branchAnalyses[selectedBranch.id].report.summary}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--foreground)]">{branchAnalyses[selectedBranch.id].report.filesAnalyzed}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">files</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--success)]">+{branchAnalyses[selectedBranch.id].report.linesAdded}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">added</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--destructive)]">-{branchAnalyses[selectedBranch.id].report.linesRemoved}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">removed</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--warning)]">{branchAnalyses[selectedBranch.id].tokensUsed || 'N/A'}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">tokens</div>
                    </div>
                  </div>

                  {/* Patterns Found */}
                  {branchAnalyses[selectedBranch.id].report.patternsFound.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[var(--primary)] font-mono mb-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                        <TrendingUp className="h-3 w-3" />
                        PATTERNS FOUND
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {branchAnalyses[selectedBranch.id].report.patternsFound.map((pattern, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 border-2 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-mono text-xs font-bold uppercase tracking-wider"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)]">
                    <h4 className="text-xs font-bold text-[var(--primary)] font-mono mb-1 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                      <Brain className="h-3 w-3" />
                      REASONING
                    </h4>
                    <p className="text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {branchAnalyses[selectedBranch.id].report.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Add ESC key handler for branch modal**

Update the ESC key handler (around line 88):

```typescript
  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCommit(null);
        setSelectedBranch(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
```

- [ ] **Step 3: Update analyzeCode to also store branch analysis**

The existing `analyzeCode` function already handles branches. Just add caching for branch analyses (update the branch analysis section around line 287):

```typescript
      } else if (sourceType === 'branch') {
        setBranches(prev => prev.map(b =>
          b.id === sourceId
            ? { ...b, is_ai_detected: analysis.isAgentic ? 1 : 0 }
            : b
        ));
        // Cache the analysis result
        setBranchAnalyses(prev => ({
          ...prev,
          [sourceId]: analysis
        }));
      }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ai-flags-tab.tsx
git commit -m "feat(ui): add branch analysis modal with detailed report"
```

---

### Task 5: Test the Implementation

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test branch expansion**
- Navigate to Admin > AI Flags
- Click on Branches tab
- Click + button on a branch - should expand and show commits
- Click again - should collapse

- [ ] **Step 3: Test branch analysis modal**
- Click on branch name - should open analysis modal
- Modal should show branch info and analysis if available

- [ ] **Step 4: Test analyze button**
- Click ANALYZE on a branch
- Should show "ANALYZING..." state
- On completion, should update badge and cache analysis

- [ ] **Step 5: Test commit click from expanded branch**
- Expand a branch
- Click on a commit - should open commit detail modal

---

### Task 6: Final Commit

- [ ] **Step 1: Verify all changes**

```bash
git status
git diff --stat
```

- [ ] **Step 2: Final commit if needed**

```bash
git add -A
git commit -m "feat: complete expandable branches with commits and analysis"
```

---

## Summary

This plan adds:
1. ✅ Expandable accordion UI for branches (+/- button)
2. ✅ Commits list shown when branch is expanded
3. ✅ Analyze button for branches (same as commits)
4. ✅ Branch analysis modal (click on branch name)
5. ✅ VIEW button to see existing analysis
6. ✅ ESC key closes modals
7. ✅ Cached branch commits and analyses for performance
