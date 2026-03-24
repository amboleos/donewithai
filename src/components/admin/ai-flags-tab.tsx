'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GitBranch, RefreshCw, GitCommit, ChevronDown, ChevronUp, ChevronRight, Search, Sparkles, Loader2, Code2, User, Plus, Minus, XCircle, Brain, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CodeAnalysisResult {
  id: number;
  isAgentic: boolean;
  confidence: number;
  report: {
    summary: string;
    patternsFound: string[];
    fileBreakdown: Array<{
      path: string;
      language: string;
      additions: number;
      deletions: number;
      isExcluded: boolean;
    }>;
    filesAnalyzed: number;
    linesAdded: number;
    linesRemoved: number;
    reasoning: string;
  };
  model: string;
  durationMs?: number;
  tokensUsed?: number;
}

interface Commit {
  id: number;
  sha: string;
  message: string;
  author: string;
  repo_id: number;
  repo_name: string;
  date: string;
  lines_added: number;
  lines_removed: number;
  // AI detection status (single source of truth from commits table)
  is_ai_detected: number | null;
}

interface Branch {
  id: number;
  name: string;
  repo_id: number;
  repo_name: string;
  // AI detection status (single source of truth from branches table)
  is_ai_detected: number | null;
}

type SortField = 'name' | 'author' | 'repo' | 'date';
type SortOrder = 'asc' | 'desc';
type CodeAnalysisFilter = 'all' | 'agentic' | 'human_assisted' | 'not_analyzed';

interface AIFlagsTabProps {
  isAdmin?: boolean;
  repoId?: number; // Optional: filter by repo
  repoName?: string; // Optional: for display purposes
}

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

export default function AIFlagsTab({ isAdmin = false, repoId, repoName }: AIFlagsTabProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [commitAnalyses, setCommitAnalyses] = useState<Record<number, CodeAnalysisResult>>({});
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<number | null>(null);
  // Branch expansion state
  const [expandedBranches, setExpandedBranches] = useState<Set<number>>(new Set());
  const [branchCommits, setBranchCommits] = useState<Record<number, Commit[]>>({});
  const [loadingBranchCommits, setLoadingBranchCommits] = useState<number | null>(null);
  // Branch analysis modal state
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchAnalyses, setBranchAnalyses] = useState<Record<number, CodeAnalysisResult>>({});
  const [loadingBranchAnalysis, setLoadingBranchAnalysis] = useState<number | null>(null);
  // Filter states
  const [codeAnalysisFilter, setCodeAnalysisFilter] = useState<CodeAnalysisFilter>('all');
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, []);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, codeAnalysisFilter, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/all');
      if (!res.ok) throw new Error('Failed to fetch AI flags data');

      const data = await res.json();

      // Filter by repoId if provided
      let filteredCommits = data.commits || [];
      let filteredBranches = data.branches || [];

      if (repoId) {
        filteredCommits = filteredCommits.filter((c: Commit) => c.repo_id === repoId);
        filteredBranches = filteredBranches.filter((b: Branch) => b.repo_id === repoId);
      }

      setCommits(filteredCommits);
      setBranches(filteredBranches);

      // Pre-populate commit analyses from API response (persists across refresh)
      if (data.analyses && Array.isArray(data.analyses)) {
        const analysesMap: Record<number, CodeAnalysisResult> = {};
        for (const analysis of data.analyses) {
          // Parse report if it's a string
          const report = typeof analysis.report === 'string'
            ? JSON.parse(analysis.report)
            : analysis.report;
          analysesMap[analysis.source_id] = {
            id: analysis.id,
            isAgentic: analysis.is_agentic === 1,
            confidence: analysis.confidence,
            report,
            model: analysis.model,
            durationMs: analysis.duration_ms,
            tokensUsed: analysis.tokens_used,
          };
        }
        setCommitAnalyses(analysesMap);
      }
    } catch (error) {
      toast.error('Failed to fetch AI flags data');
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

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Helper to render AI detection badge (based on is_ai_detected from commits/branches tables)
  const AIDetectionBadge = ({ isAIDetected }: { isAIDetected: number | null }) => {
    if (isAIDetected === null || isAIDetected === undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-[var(--muted-foreground)] bg-[var(--muted)] text-[var(--muted-foreground)]">
          <Code2 className="h-3 w-3" /> NOT ANALYZED
        </span>
      );
    }

    if (isAIDetected === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-[var(--destructive)] bg-[var(--destructive)]/10 text-[var(--destructive)]">
          <Sparkles className="h-3 w-3" /> AGENTIC AI
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]">
        <User className="h-3 w-3" /> HUMAN
      </span>
    );
  };

  // Apply AI detection filter (based on is_ai_detected)
  const matchesCodeAnalysisFilter = (isAIDetected: number | null): boolean => {
    if (codeAnalysisFilter === 'all') return true;
    if (codeAnalysisFilter === 'agentic') return isAIDetected === 1;
    if (codeAnalysisFilter === 'human_assisted') return isAIDetected === 0;
    if (codeAnalysisFilter === 'not_analyzed') return isAIDetected === null;
    return true;
  };

  const filteredAndSortedCommits = [...commits]
    .filter(c =>
      (c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sha.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesCodeAnalysisFilter(c.is_ai_detected)
    )
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.message;
          bVal = b.message;
          break;
        case 'author':
          aVal = a.author.toLowerCase();
          bVal = b.author.toLowerCase();
          break;
        case 'repo':
          aVal = a.repo_name.toLowerCase();
          bVal = b.repo_name.toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Helper to get line changes from commit or analysis (analysis takes precedence)
  const getLineChanges = (commit: Commit) => {
    const analysis = commitAnalyses[commit.id];
    if (analysis?.report) {
      return {
        added: analysis.report.linesAdded || 0,
        removed: analysis.report.linesRemoved || 0,
      };
    }
    return {
      added: commit.lines_added || 0,
      removed: commit.lines_removed || 0,
    };
  };

  // Calculate total line changes from filtered commits (using analysis data when available)
  const totalLineChanges = filteredAndSortedCommits.reduce(
    (acc, commit) => {
      const changes = getLineChanges(commit);
      return {
        added: acc.added + changes.added,
        removed: acc.removed + changes.removed,
      };
    },
    { added: 0, removed: 0 }
  );

  // Check if any commit has line data (from commit or analysis)
  const hasLineData = filteredAndSortedCommits.some((c) => {
    const changes = getLineChanges(c);
    return changes.added > 0 || changes.removed > 0;
  });

  const filteredAndSortedBranches = [...branches]
    .filter(b =>
      (b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.repo_name.toLowerCase().includes(searchQuery.toLowerCase())) &&
      matchesCodeAnalysisFilter(b.is_ai_detected)
    )
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'repo':
          aVal = a.repo_name.toLowerCase();
          bVal = b.repo_name.toLowerCase();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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

  const toggleAI = async (type: 'commit' | 'branch', id: number, currentValue: boolean | null) => {
    try {
      const res = await fetch('/api/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, isAI: !currentValue }),
      });

      if (!res.ok) throw new Error('Failed to toggle');

      toast.success(`${type === 'commit' ? 'Commit' : 'Branch'} AI flag updated`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update AI flag');
    }
  };

  const analyzeCode = async (repoId: number, sourceType: 'commit' | 'branch', sourceId: number) => {
    setAnalyzingId(sourceId);
    try {
      const res = await fetch('/api/ai/code-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId, sourceType, sourceId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await res.json();
      const analysis = data.analysis as CodeAnalysisResult;

      // Store analysis result for this commit
      setCommitAnalyses(prev => ({
        ...prev,
        [sourceId]: analysis
      }));

      // Update the commit's is_ai_detected in local state (no refresh needed)
      if (sourceType === 'commit') {
        let updatedCommit: Commit | null = null;
        setCommits(prev => prev.map(c => {
          if (c.id === sourceId) {
            updatedCommit = { ...c, is_ai_detected: analysis.isAgentic ? 1 : 0 };
            return updatedCommit;
          }
          return c;
        }));
        // Also update selectedCommit if it's the same one
        if (selectedCommit?.id === sourceId) {
          setSelectedCommit(prev => prev ? { ...prev, is_ai_detected: analysis.isAgentic ? 1 : 0 } : null);
        }
        // Open the modal with the analyzed commit (if not already open)
        if (updatedCommit && selectedCommit?.id !== sourceId) {
          setSelectedCommit(updatedCommit);
        }
      } else if (sourceType === 'branch') {
        let updatedBranch: Branch | null = null;
        setBranches(prev => prev.map(b => {
          if (b.id === sourceId) {
            updatedBranch = { ...b, is_ai_detected: analysis.isAgentic ? 1 : 0 };
            return updatedBranch;
          }
          return b;
        }));
        // Cache the analysis result
        setBranchAnalyses(prev => ({
          ...prev,
          [sourceId]: analysis
        }));
        // Open the modal with the analyzed branch (if not already open)
        if (updatedBranch && selectedBranch?.id !== sourceId) {
          setSelectedBranch(updatedBranch);
        }
      }

      toast.success('Code analysis completed');
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  // Fetch existing analysis for a commit when selecting it
  const fetchCommitAnalysis = async (commitId: number, repoId: number) => {
    if (commitAnalyses[commitId]) return; // Already cached

    setLoadingAnalysis(commitId);
    try {
      const res = await fetch(`/api/ai/code-analysis?repoId=${repoId}&sourceType=commit&sourceId=${commitId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setCommitAnalyses(prev => ({
            ...prev,
            [commitId]: data.analysis
          }));
        }
      }
    } catch (error) {
      // Silently fail - analysis may not exist yet
    } finally {
      setLoadingAnalysis(null);
    }
  };

  // Handle commit selection - fetch analysis if available
  const handleSelectCommit = (commit: Commit) => {
    setSelectedCommit(commit);
    fetchCommitAnalysis(commit.id, commit.repo_id);
  };

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
      // Silently fail - analysis may not exist yet
    } finally {
      setLoadingBranchAnalysis(null);
    }
  };

  // Handle branch selection for modal
  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    fetchBranchAnalysis(branch.id, branch.repo_id);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING AI FLAGS...]</span>
        </div>
      </div>
    );
  }

  // AI detection stats (based on is_ai_detected)
  const agenticCount = [...commits, ...branches].filter(item => item.is_ai_detected === 1).length;
  const humanAssistedCount = [...commits, ...branches].filter(item => item.is_ai_detected === 0).length;
  const notAnalyzedCount = [...commits, ...branches].filter(item => item.is_ai_detected === null).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-6 bg-[var(--muted)] px-4 py-3 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <div className="flex items-center gap-2 font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">stats</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)]">commits:</span>
            <span className="text-[var(--foreground)]">{commits.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)]">branches:</span>
            <span className="text-[var(--foreground)]">{branches.length}</span>
          </div>
          <div className="flex items-center gap-2 border-l-2 border-[var(--border)] pl-4">
            <Sparkles className="h-4 w-4 text-[var(--destructive)]" />
            <span className="text-[var(--muted-foreground)]">agentic:</span>
            <span className="text-[var(--destructive)]">{agenticCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <span className="text-[var(--muted-foreground)]">human_assisted:</span>
            <span style={{ color: 'var(--primary)' }}>{humanAssistedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[var(--muted-foreground)]">not_analyzed:</span>
            <span className="text-[var(--muted-foreground)]">{notAnalyzedCount}</span>
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setActiveTab('commits'); setSearchQuery(''); setCodeAnalysisFilter('all'); }}
          className={`
            flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all border-2
            ${activeTab === 'commits'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border-transparent'
            }
          `}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <GitCommit className="h-4 w-4" />
          COMMITS
          <span className="text-xs opacity-50">[{commits.length}]</span>
        </button>
        <button
          onClick={() => { setActiveTab('branches'); setSearchQuery(''); setCodeAnalysisFilter('all'); }}
          className={`
            flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all border-2
            ${activeTab === 'branches'
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border-transparent'
            }
          `}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <GitBranch className="h-4 w-4" />
          BRANCHES
          <span className="text-xs opacity-50">[{branches.length}]</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-2 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Code Analysis Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>CODE:</span>
          <div className="flex gap-1">
            {(['all', 'agentic', 'human_assisted', 'not_analyzed'] as CodeAnalysisFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setCodeAnalysisFilter(filter)}
                className={`
                  px-2 py-1 rounded text-xs font-mono transition-colors border-2
                  ${codeAnalysisFilter === filter
                    ? filter === 'agentic'
                      ? 'bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)] [box-shadow:var(--shadow-brutal-sm)]'
                      : filter === 'human_assisted'
                        ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]'
                        : filter === 'not_analyzed'
                          ? 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
                          : 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                  }
                `}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {filter === 'all' ? 'ALL' : filter === 'human_assisted' ? 'HUMAN' : filter.toUpperCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters Button */}
        {codeAnalysisFilter !== 'all' && (
          <button
            onClick={() => setCodeAnalysisFilter('all')}
            className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            [CLEAR FILTERS]
          </button>
        )}
      </div>

      {/* Total Line Changes Summary */}
      {activeTab === 'commits' && filteredAndSortedCommits.length > 0 && (
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
              (run sync or analyze to calculate)
            </span>
          )}
        </div>
      )}

      {/* Commits Table */}
      {activeTab === 'commits' && (
        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden">
          {filteredAndSortedCommits.length === 0 ? (
            <div className="text-center py-12">
              <GitCommit className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {searchQuery ? 'No matching commits found.' : 'No commits to manage. Add repositories first.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--muted)]">
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('name')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                      <div className="flex items-center gap-1">MESSAGE <SortIndicator field="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('author')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                      <div className="flex items-center gap-1">AUTHOR <SortIndicator field="author" /></div>
                    </th>
                    {!repoId && (
                      <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('repo')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                        <div className="flex items-center gap-1">REPO <SortIndicator field="repo" /></div>
                      </th>
                    )}
                    <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('date')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                      <div className="flex items-center gap-1">DATE <SortIndicator field="date" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>LINES</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>CODE ANALYSIS</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTION</th>
                    )}
                  </tr>
                </thead>
                <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {paginatedCommits.map((commit) => (
                    <tr
                      key={commit.id}
                      className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer"
                      onClick={() => handleSelectCommit(commit)}
                    >
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-[var(--foreground)] truncate" style={{ fontFamily: 'Sora, sans-serif' }}>{commit.message.split('\n')[0]}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{commit.sha.substring(0, 7)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{commit.author}</td>
                      {!repoId && (
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{commit.repo_name}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {commit.date ? new Date(commit.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Plus className="h-3 w-3" />
                            {getLineChanges(commit).added}
                          </span>
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <Minus className="h-3 w-3" />
                            {getLineChanges(commit).removed}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <AIDetectionBadge isAIDetected={commit.is_ai_detected} />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Analyze Button */}
                            <button
                              onClick={() => analyzeCode(commit.repo_id, 'commit', commit.id)}
                              disabled={analyzingId === commit.id}
                              title="Analyze code for AI patterns"
                              className={`
                                px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1 border-2
                                ${analyzingId === commit.id
                                  ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)] cursor-wait'
                                  : 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)] hover:bg-[var(--warning)]/20'
                                }
                              `}
                              style={{ fontFamily: 'JetBrains Mono, monospace' }}
                            >
                              {analyzingId === commit.id ? (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        </div>
      )}

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
                  {paginatedBranches.map((branch) => {
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
                          <td className="px-2 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleBranchExpand(branch)}
                              className="p-1 hover:bg-[var(--muted)] rounded transition-colors"
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
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
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
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
                              <div className="p-3 pl-12 border-t-2 border-[var(--border)]">
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
                                            <span className="text-xs font-mono text-green-600 dark:text-green-400">+{getLineChanges(commit).added}</span>
                                            <span className="text-xs font-mono text-red-600 dark:text-red-400">-{getLineChanges(commit).removed}</span>
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
        </div>
      )}

      {/* Commit Message Modal */}
      {selectedCommit && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCommit(null)}
        >
          <div
            className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--muted)]">
              <div className="flex items-center gap-3">
                <GitCommit className="h-5 w-5 text-[var(--primary)]" />
                <span className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedCommit.sha.substring(0, 7)}
                </span>
              </div>
              <button
                onClick={() => setSelectedCommit(null)}
                className="p-1 hover:bg-[var(--muted)] rounded transition-colors"
              >
                <XCircle className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-60px)]">
              <div>
                <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  MESSAGE
                </label>
                <p className="mt-1 text-[var(--foreground)] whitespace-pre-wrap" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {selectedCommit.message}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    AUTHOR
                  </label>
                  <p className="mt-1 text-[var(--foreground)]">{selectedCommit.author}</p>
                </div>
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    DATE
                  </label>
                  <p className="mt-1 text-[var(--foreground)]">
                    {selectedCommit.date ? new Date(selectedCommit.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    LINES ADDED
                  </label>
                  <p className="mt-1 text-green-600 dark:text-green-400 font-mono">+{getLineChanges(selectedCommit).added}</p>
                </div>
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    LINES REMOVED
                  </label>
                  <p className="mt-1 text-red-600 dark:text-red-400 font-mono">-{getLineChanges(selectedCommit).removed}</p>
                </div>
                <div>
                  <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    REPO
                  </label>
                  <p className="mt-1 text-[var(--foreground)]">{selectedCommit.repo_name}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  CODE ANALYSIS
                </label>
                <div className="mt-1">
                  <AIDetectionBadge isAIDetected={selectedCommit.is_ai_detected} />
                </div>
              </div>

              {/* Analysis Details Section */}
              {loadingAnalysis === selectedCommit.id && (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)] py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-mono text-sm">Loading analysis...</span>
                </div>
              )}

              {commitAnalyses[selectedCommit.id] && (
                <div className="border-t-2 border-[var(--border)] pt-4 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {commitAnalyses[selectedCommit.id].isAgentic ? (
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
                          {commitAnalyses[selectedCommit.id].isAgentic ? 'AGENTIC AI DETECTED' : 'HUMAN'}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] font-mono">
                          {commitAnalyses[selectedCommit.id].model} - {commitAnalyses[selectedCommit.id].durationMs ? `${(commitAnalyses[selectedCommit.id].durationMs! / 1000).toFixed(1)}s` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-[var(--foreground)]">{Math.round(commitAnalyses[selectedCommit.id].confidence * 100)}%</div>
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
                      {commitAnalyses[selectedCommit.id].report.summary}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--foreground)]">{commitAnalyses[selectedCommit.id].report.filesAnalyzed}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">files</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--success)]">+{commitAnalyses[selectedCommit.id].report.linesAdded}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">added</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--destructive)]">-{commitAnalyses[selectedCommit.id].report.linesRemoved}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">removed</div>
                    </div>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
                      <div className="text-lg font-bold font-mono text-[var(--warning)]">{commitAnalyses[selectedCommit.id].tokensUsed || 'N/A'}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">tokens</div>
                    </div>
                  </div>

                  {/* Patterns Found */}
                  {commitAnalyses[selectedCommit.id].report.patternsFound.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[var(--primary)] font-mono mb-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                        <TrendingUp className="h-3 w-3" />
                        PATTERNS FOUND
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {commitAnalyses[selectedCommit.id].report.patternsFound.map((pattern, i) => (
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

                  {/* File Breakdown */}
                  {commitAnalyses[selectedCommit.id].report.fileBreakdown.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[var(--primary)] font-mono mb-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                        <FileText className="h-3 w-3" />
                        FILE BREAKDOWN ({commitAnalyses[selectedCommit.id].report.fileBreakdown.length} files)
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {commitAnalyses[selectedCommit.id].report.fileBreakdown.slice(0, 10).map((file, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-1.5 border-2 ${
                              file.isExcluded
                                ? 'bg-[var(--muted)]/50 border-[var(--border)] text-[var(--muted-foreground)]'
                                : 'bg-[var(--muted)] border-[var(--border)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {file.isExcluded ? (
                                <AlertCircle className="h-3 w-3 text-[var(--muted-foreground)] shrink-0" />
                              ) : (
                                <CheckCircle className="h-3 w-3 text-[var(--success)] shrink-0" />
                              )}
                              <span className="text-xs font-mono truncate">{file.path}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-mono text-[var(--muted-foreground)]">{file.language}</span>
                              <span className="text-xs font-mono text-[var(--success)]">+{file.additions}</span>
                              <span className="text-xs font-mono text-[var(--destructive)]">-{file.deletions}</span>
                            </div>
                          </div>
                        ))}
                        {commitAnalyses[selectedCommit.id].report.fileBreakdown.length > 10 && (
                          <div className="text-xs text-[var(--muted-foreground)] font-mono text-center py-1">
                            +{commitAnalyses[selectedCommit.id].report.fileBreakdown.length - 10} more files
                          </div>
                        )}
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
                      {commitAnalyses[selectedCommit.id].report.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
