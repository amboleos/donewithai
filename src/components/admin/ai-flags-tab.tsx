'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GitBranch, RefreshCw, Check, X, Brain, GitCommit, ChevronDown, ChevronUp, Search, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AnalysisReportModal from '@/components/ai-analysis-report-modal';

interface Commit {
  id: number;
  sha: string;
  message: string;
  author: string;
  repo_id: number;
  is_ai_detected: boolean | null;
  repo_name: string;
}

interface Branch {
  id: number;
  name: string;
  repo_id: number;
  is_ai_detected: boolean | null;
  repo_name: string;
}

type SortField = 'name' | 'author' | 'repo' | 'status';
type SortOrder = 'asc' | 'desc';

export default function AIFlagsTab() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/all');
      if (!res.ok) throw new Error('Failed to fetch admin data');

      const data = await res.json();
      setCommits(data.commits || []);
      setBranches(data.branches || []);
    } catch (error) {
      toast.error('Failed to fetch admin data');
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

  const filteredAndSortedCommits = [...commits]
    .filter(c =>
      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.repo_name.toLowerCase().includes(searchQuery.toLowerCase())
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
        case 'status':
          aVal = a.is_ai_detected ? 0 : 1;
          bVal = b.is_ai_detected ? 0 : 1;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const filteredAndSortedBranches = [...branches]
    .filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.repo_name.toLowerCase().includes(searchQuery.toLowerCase())
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
        case 'status':
          aVal = a.is_ai_detected ? 0 : 1;
          bVal = b.is_ai_detected ? 0 : 1;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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
      setAnalysisResult(data.analysis);
      toast.success('Code analysis completed');

      // Refresh data to show updated AI status
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-green-500 font-mono">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>[LOADING AI FLAGS...]</span>
        </div>
      </div>
    );
  }

  const aiCommitsCount = commits.filter(c => c.is_ai_detected).length;
  const aiBranchesCount = branches.filter(b => b.is_ai_detected).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-6 bg-slate-900/50 px-4 py-3 rounded border border-slate-800">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-green-500">$</span>
          <span className="text-slate-400">stats</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono">
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-slate-500" />
            <span className="text-slate-500">commits:</span>
            <span className="text-slate-300">{commits.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-slate-500" />
            <span className="text-slate-500">branches:</span>
            <span className="text-slate-300">{branches.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="text-slate-500">ai_detected:</span>
            <span className="text-purple-400">{aiCommitsCount + aiBranchesCount}</span>
          </div>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setActiveTab('commits'); setSearchQuery(''); }}
          className={`
            flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all
            ${activeTab === 'commits'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
            }
          `}
        >
          <GitCommit className="h-4 w-4" />
          COMMITS
          <span className="text-xs opacity-50">[{commits.length}]</span>
        </button>
        <button
          onClick={() => { setActiveTab('branches'); setSearchQuery(''); }}
          className={`
            flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all
            ${activeTab === 'branches'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
            }
          `}
        >
          <GitBranch className="h-4 w-4" />
          BRANCHES
          <span className="text-xs opacity-50">[{branches.length}]</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded border border-slate-800">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono text-sm placeholder:text-slate-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-500 hover:text-slate-300 font-mono"
          >
            [ESC]
          </button>
        )}
      </div>

      {/* Commits Table */}
      {activeTab === 'commits' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          {filteredAndSortedCommits.length === 0 ? (
            <div className="text-center py-12">
              <GitCommit className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="font-mono text-slate-500">
                {searchQuery ? 'No matching commits found.' : 'No commits to manage. Add repositories first.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-green-900/30">
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">MESSAGE <SortIndicator field="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('author')}>
                      <div className="flex items-center gap-1">AUTHOR <SortIndicator field="author" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('repo')}>
                      <div className="flex items-center gap-1">REPO <SortIndicator field="repo" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">STATUS <SortIndicator field="status" /></div>
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-xs text-green-500">ACTION</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {filteredAndSortedCommits.map((commit) => (
                    <tr key={commit.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-slate-200 truncate">{commit.message.split('\n')[0]}</p>
                          <p className="text-xs text-slate-600">{commit.sha.substring(0, 7)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{commit.author}</td>
                      <td className="px-4 py-3 text-slate-500">{commit.repo_name}</td>
                      <td className="px-4 py-3">
                        {commit.is_ai_detected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Check className="h-3 w-3" /> AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-400 border border-slate-600">
                            <X className="h-3 w-3" /> HUMAN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Analyze Button */}
                          <button
                            onClick={() => analyzeCode(commit.repo_id, 'commit', commit.id)}
                            disabled={analyzingId === commit.id}
                            title="Analyze code for AI patterns"
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1
                              ${analyzingId === commit.id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                              }
                            `}
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

                          {/* Toggle AI Button */}
                          <button
                            onClick={() => toggleAI('commit', commit.id, commit.is_ai_detected)}
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors
                              ${commit.is_ai_detected
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                              }
                            `}
                          >
                            {commit.is_ai_detected ? 'SET_HUMAN' : 'SET_AI'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Branches Table */}
      {activeTab === 'branches' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          {filteredAndSortedBranches.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="font-mono text-slate-500">
                {searchQuery ? 'No matching branches found.' : 'No branches to manage. Add repositories first.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-green-900/30">
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">NAME <SortIndicator field="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('repo')}>
                      <div className="flex items-center gap-1">REPO <SortIndicator field="repo" /></div>
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">STATUS <SortIndicator field="status" /></div>
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-xs text-green-500">ACTION</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {filteredAndSortedBranches.map((branch) => (
                    <tr key={branch.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-indigo-400" />
                          <span className="text-slate-200">{branch.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{branch.repo_name}</td>
                      <td className="px-4 py-3">
                        {branch.is_ai_detected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            <Check className="h-3 w-3" /> AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-400 border border-slate-600">
                            <X className="h-3 w-3" /> HUMAN
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Analyze Button */}
                          <button
                            onClick={() => analyzeCode(branch.repo_id, 'branch', branch.id)}
                            disabled={analyzingId === branch.id}
                            title="Analyze code for AI patterns"
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors flex items-center gap-1
                              ${analyzingId === branch.id
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-wait'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                              }
                            `}
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

                          {/* Toggle AI Button */}
                          <button
                            onClick={() => toggleAI('branch', branch.id, branch.is_ai_detected)}
                            className={`
                              px-3 py-1 rounded font-mono text-xs transition-colors
                              ${branch.is_ai_detected
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
                                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                              }
                            `}
                          >
                            {branch.is_ai_detected ? 'SET_HUMAN' : 'SET_AI'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analysis Report Modal */}
      <AnalysisReportModal
        isOpen={!!analysisResult}
        onClose={() => setAnalysisResult(null)}
        analysis={analysisResult}
      />
    </div>
  );
}
