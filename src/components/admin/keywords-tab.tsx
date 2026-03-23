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
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Plus className="h-5 w-5 animate-pulse text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING KEYWORDS...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">keywords</span>
          <span className="text-[var(--muted-foreground)]">:: total={keywords.length}</span>
          <span className="text-[var(--muted-foreground)]">:: active={keywords.filter(k => k.is_active).length}</span>
        </div>
      </div>

      {/* Add keyword input */}
      <div className="flex gap-2 items-center bg-[var(--muted)] p-3 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <span className="text-[var(--primary)] font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>$</span>
        <input
          type="text"
          placeholder="add keyword (e.g., 'copilot', 'gpt')..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          className="flex-1 bg-transparent border-none outline-none font-mono text-sm placeholder:text-[var(--muted-foreground)]"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}
        />
        <button
          onClick={addKeyword}
          disabled={!newKeyword.trim()}
          className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] text-[var(--primary-foreground)] font-mono text-xs rounded transition-colors border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] disabled:shadow-none hover:translate-x-px hover:translate-y-px hover:shadow-none"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          ADD
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-2 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Filter keywords..."
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

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-[var(--primary-light)] border-2 border-[var(--primary)] rounded [box-shadow:var(--shadow-brutal-sm)]">
        <AlertTriangle className="h-5 w-5 text-[var(--primary)] shrink-0" />
        <p className="text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
          Commits containing these keywords will be auto-flagged as AI-generated.
          <br />
          <span className="text-[var(--muted-foreground)]">Use sparingly to avoid false positives.</span>
        </p>
      </div>

      {/* Keywords table */}
      {filteredAndSortedKeywords.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
          <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {searchQuery ? 'No matching keywords found.' : 'No keywords configured.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('keyword')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">KEYWORD <SortIndicator field="keyword" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('status')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">STATUS <SortIndicator field="status" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('created_at')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">CREATED <SortIndicator field="created_at" /></div>
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {filteredAndSortedKeywords.map((kw) => (
                <tr key={kw.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded border-2 border-[var(--primary)]">
                      {kw.keyword}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {kw.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--success)]/10 text-[var(--success)] border-2 border-[var(--success)]">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[var(--muted)] text-[var(--muted-foreground)] border-2 border-[var(--border)]">
                        INACTIVE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {new Date(kw.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleKeyword(kw.id, !!kw.is_active)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--warning)] hover:bg-[var(--warning)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--warning)]"
                        title={kw.is_active ? 'Disable' : 'Enable'}
                      >
                        {kw.is_active ? (
                          <ToggleRight className="h-4 w-4 text-[var(--success)]" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, keyword: kw })}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--destructive)]"
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
            <p className="text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Are you sure you want to delete this keyword?</p>
            <p className="text-[var(--success)]">&gt; "{deleteConfirm.keyword?.keyword}"</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
