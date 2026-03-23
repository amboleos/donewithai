'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Trash2, RotateCcw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import AddRepoDialog from '@/components/dashboard/add-repo-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: string;
  last_synced: Date | null;
  created_at: Date;
  sync_error: string | null;
}

type SortField = 'name' | 'provider' | 'last_synced' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ReposTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; repo: Repo | null }>({ open: false, repo: null });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch {
      toast.error('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'provider':
          aVal = a.provider;
          bVal = b.provider;
          break;
        case 'last_synced':
          aVal = a.last_synced ? new Date(a.last_synced).getTime() : 0;
          bVal = b.last_synced ? new Date(b.last_synced).getTime() : 0;
          break;
        case 'status':
          aVal = a.sync_error ? 1 : 0;
          bVal = b.sync_error ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [repos, sortField, sortOrder]);

  const handleAddRepo = async (url: string) => {
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to add repo');

      const data = await res.json();
      setRepos((prev) => [data.repo, ...prev]);
      setAddDialogOpen(false);
      toast.success('Repository added');
    } catch {
      toast.error('Failed to add repository');
    }
  };

  const handleDeleteRepo = async () => {
    const repo = deleteConfirm.repo;
    if (!repo) return;

    try {
      await fetch(`/api/repos?id=${repo.id}`, { method: 'DELETE' });
      setRepos((prev) => prev.filter((r) => r.id !== repo.id));
      toast.success(`Repository "${repo.name}" deleted`);
      setDeleteConfirm({ open: false, repo: null });
    } catch {
      toast.error('Failed to delete repository');
    }
  };

  const handleSyncRepo = async (url: string, name: string) => {
    try {
      toast.loading(`Syncing ${name}...`, { id: `sync-${name}` });
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to sync');

      toast.success(`${name} synced successfully`, { id: `sync-${name}` });
      fetchRepos();
    } catch {
      toast.error(`Failed to sync ${name}`, { id: `sync-${name}` });
    }
  };

  const handleRecheckAI = async (repoId: number, repoName: string) => {
    try {
      toast.loading(`Re-checking AI for ${repoName}...`, { id: `recheck-${repoId}` });
      const res = await fetch('/api/sync/recheck-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId }),
      });

      if (!res.ok) throw new Error('Failed to recheck AI');

      const data = await res.json();
      toast.success(
        `Found ${data.commits.markedAI} AI commits, ${data.branches.markedAI} AI branches`,
        { id: `recheck-${repoId}` }
      );
      fetchRepos();
    } catch {
      toast.error('Failed to re-check AI', { id: `recheck-${repoId}` });
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const getStatusBadge = (repo: Repo) => {
    if (repo.sync_error) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <AlertCircle className="h-3 w-3" />
          ERROR
        </span>
      );
    }
    if (!repo.last_synced) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          PENDING
        </span>
      );
    }
    const syncedDate = new Date(repo.last_synced);
    const hoursAgo = (Date.now() - syncedDate.getTime()) / (1000 * 60 * 60);

    if (hoursAgo > 24) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          STALE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          SYNCED
        </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING REPOSITORIES...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">repos</span>
          <span className="text-[var(--muted-foreground)]">:: count={repos.length}</span>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          variant="default"
          className="font-mono text-xs"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD_REPO
        </Button>
      </div>

      {/* Data table */}
      {repos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
          <Database className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No repositories found.</p>
          <p className="font-mono text-sm text-[var(--muted-foreground)] mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Add a repository to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('name')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">NAME <SortIndicator field="name" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('provider')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">PROVIDER <SortIndicator field="provider" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('last_synced')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">LAST_SYNCED <SortIndicator field="last_synced" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('status')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">STATUS <SortIndicator field="status" /></div>
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {sortedRepos.map((repo) => (
                <tr key={repo.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>{repo.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">{repo.url}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs border-2 ${
                      repo.provider === 'github'
                        ? 'bg-[var(--muted)] text-[var(--foreground)] border-[var(--border)]'
                        : 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]'
                    }`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {repo.provider.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {repo.last_synced
                      ? new Date(repo.last_synced).toLocaleString()
                      : <span className="text-[var(--muted-foreground)]">Never</span>
                    }
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(repo)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSyncRepo(repo.url, repo.name)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded transition-colors border-2 border-transparent hover:border-[var(--primary)]"
                        title="Sync"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRecheckAI(repo.id, repo.name)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded transition-colors border-2 border-transparent hover:border-[var(--accent)]"
                        title="Recheck AI"
                      >
                        <Brain className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, repo })}
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

      {/* Add Dialog */}
      <AddRepoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddRepo}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, repo: null })}
        onConfirm={handleDeleteRepo}
        title="Delete Repository"
        message={
          <div className="font-mono text-sm">
            <p className="text-slate-300 mb-2">Are you sure you want to delete this repository?</p>
            <p className="text-green-400">&gt; {deleteConfirm.repo?.name}</p>
            <p className="text-slate-500 mt-2">This action cannot be undone.</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}

// Import needed icons
import { Database, Brain } from 'lucide-react';
