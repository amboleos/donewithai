'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Search, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AIKeyword {
  id: number;
  keyword: string;
  is_active: number;
  created_at: string;
}

type SortField = 'keyword' | 'status' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function KeywordsTab() {
  const [keywords, setKeywords] = useState<AIKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('keyword');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; keyword: AIKeyword | null }>({ open: false, keyword: null });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keywords');
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      toast.error('Failed to load keywords');
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

  const filteredAndSortedKeywords = useMemo(() => {
    return [...keywords]
      .filter(kw =>
        kw.keyword.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'keyword':
            aVal = a.keyword.toLowerCase();
            bVal = b.keyword.toLowerCase();
            break;
          case 'status':
            aVal = a.is_active ? 0 : 1;
            bVal = b.is_active ? 0 : 1;
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
  }, [keywords, sortField, sortOrder, searchQuery]);

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add keyword');
      }

      await fetchKeywords();
      setNewKeyword('');
      toast.success(`Keyword "${newKeyword.trim()}" added`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add keyword');
    }
  };

  const handleDeleteKeyword = async () => {
    const kw = deleteConfirm.keyword;
    if (!kw) return;

    try {
      await fetch(`/api/admin/keywords?id=${kw.id}`, { method: 'DELETE' });
      await fetchKeywords();
      toast.success(`Keyword "${kw.keyword}" deleted`);
      setDeleteConfirm({ open: false, keyword: null });
    } catch (error) {
      toast.error('Failed to delete keyword');
    }
  };

  const toggleKeyword = async (id: number, isActive: boolean) => {
    try {
      await fetch('/api/admin/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      await fetchKeywords();
      toast.success(`Keyword ${isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update keyword');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-green-500 font-mono">
          <Plus className="h-5 w-5 animate-pulse" />
          <span>[LOADING KEYWORDS...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-mono text-slate-500">
          <span className="text-green-500">$</span>
          <span>keywords</span>
          <span className="text-slate-600">:: total={keywords.length}</span>
          <span className="text-slate-600">:: active={keywords.filter(k => k.is_active).length}</span>
        </div>
      </div>

      {/* Add keyword input */}
      <div className="flex gap-2 items-center bg-slate-900/50 p-3 rounded border border-slate-800">
        <span className="text-green-500 font-mono text-sm">$</span>
        <input
          type="text"
          placeholder="add keyword (e.g., 'copilot', 'gpt')..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono text-sm placeholder:text-slate-600"
        />
        <button
          onClick={addKeyword}
          disabled={!newKeyword.trim()}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-mono text-xs rounded transition-colors"
        >
          ADD
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded border border-slate-800">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter keywords..."
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

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
        <AlertTriangle className="h-5 w-5 text-blue-400 shrink-0" />
        <p className="text-sm font-mono text-blue-300">
          Commits containing these keywords will be auto-flagged as AI-generated.
          <br />
          <span className="text-slate-500">Use sparingly to avoid false positives.</span>
        </p>
      </div>

      {/* Keywords table */}
      {filteredAndSortedKeywords.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <p className="font-mono text-slate-500">
            {searchQuery ? 'No matching keywords found.' : 'No keywords configured.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-green-900/30">
                <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('keyword')}>
                  <div className="flex items-center gap-1">KEYWORD <SortIndicator field="keyword" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">STATUS <SortIndicator field="status" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs text-green-500 cursor-pointer hover:text-green-400" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">CREATED <SortIndicator field="created_at" /></div>
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs text-green-500">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {filteredAndSortedKeywords.map((kw) => (
                <tr key={kw.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                      {kw.keyword}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {kw.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-400 border border-slate-600">
                        INACTIVE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(kw.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleKeyword(kw.id, !!kw.is_active)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                        title={kw.is_active ? 'Disable' : 'Enable'}
                      >
                        {kw.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-400" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, keyword: kw })}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, keyword: null })}
        onConfirm={handleDeleteKeyword}
        title="Delete Keyword"
        message={
          <div className="font-mono text-sm">
            <p className="text-slate-300 mb-2">Are you sure you want to delete this keyword?</p>
            <p className="text-green-400">&gt; "{deleteConfirm.keyword?.keyword}"</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
