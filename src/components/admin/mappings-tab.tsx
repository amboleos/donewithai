'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Trash2, GitBranch, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Repo {
  id: number;
  name: string;
}

interface PublicUser {
  id: number;
  name: string;
  email: string;
  github_username: string | null;
  role: string;
}

interface UserMapping {
  id: number;
  repo_id: number;
  github_username: string;
  user_id: number;
  name: string;
  email: string;
}

export default function MappingsTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [unmappedUsers, setUnmappedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMapping, setAddingMapping] = useState(false);
  const [newGithubUsername, setNewGithubUsername] = useState('');
  const [newUserId, setNewUserId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; mapping: UserMapping | null }>({ open: false, mapping: null });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [reposRes, usersRes] = await Promise.all([
        fetch('/api/repos'),
        fetch('/api/admin/users'),
      ]);

      const reposData = await reposRes.json();
      const usersData = await usersRes.json();

      setRepos(reposData.repos || []);
      setUsers(usersData.users || []);

      // Auto-select first repo
      if (reposData.repos?.length > 0) {
        setSelectedRepo(reposData.repos[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchMappings(selectedRepo);
    }
  }, [selectedRepo]);

  const fetchMappings = async (repoId: number) => {
    try {
      const res = await fetch(`/api/admin/github-users/${repoId}`);
      const data = await res.json();
      setMappings(data.mapped || []);
      setUnmappedUsers(data.unmapped || []);
    } catch (error) {
      toast.error('Failed to fetch mappings');
    }
  };

  const handleAddMapping = async () => {
    if (!selectedRepo || !newGithubUsername || !newUserId) {
      toast.error('Please fill in all fields');
      return;
    }

    setAddingMapping(true);
    try {
      const res = await fetch('/api/admin/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: selectedRepo,
          githubUsername: newGithubUsername,
          userId: newUserId,
        }),
      });

      if (!res.ok) throw new Error('Failed to add mapping');

      toast.success('Mapping added');
      setNewGithubUsername('');
      setNewUserId(null);
      fetchMappings(selectedRepo);
    } catch (error) {
      toast.error('Failed to add mapping');
    } finally {
      setAddingMapping(false);
    }
  };

  const handleDeleteMapping = async () => {
    const mapping = deleteConfirm.mapping;
    if (!mapping) return;

    try {
      await fetch(`/api/admin/mappings/${mapping.id}`, { method: 'DELETE' });
      toast.success('Mapping deleted');
      if (selectedRepo) {
        fetchMappings(selectedRepo);
      }
      setDeleteConfirm({ open: false, mapping: null });
    } catch (error) {
      toast.error('Failed to delete mapping');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING MAPPINGS...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Repo selector */}
      <div>
        <div className="flex items-center gap-2 text-sm font-mono mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">select_repo</span>
        </div>
        {repos.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-lg">
            <GitBranch className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No repositories available</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 bg-[var(--muted)] p-3 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => setSelectedRepo(repo.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all border-2
                  ${selectedRepo === repo.id
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border-transparent'
                  }
                `}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <GitBranch className="h-4 w-4" />
                <span style={{ fontFamily: 'Sora, sans-serif' }}>{repo.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRepo && (
        <>
          {/* Add new mapping */}
          <div>
            <div className="flex items-center gap-2 text-sm font-mono mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span className="text-[var(--primary)]">$</span>
              <span className="text-[var(--muted-foreground)]">add_mapping</span>
            </div>
            <div className="bg-[var(--muted)] p-4 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>
                    GitHub Username (from commits)
                  </label>
                  <select
                    className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded px-3 py-2 font-mono text-sm focus:border-[var(--primary)] focus:outline-none [box-shadow:var(--shadow-brutal-sm)]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}
                    value={newGithubUsername}
                    onChange={(e) => setNewGithubUsername(e.target.value)}
                  >
                    <option value="">Select user...</option>
                    {unmappedUsers.map((username) => (
                      <option key={username} value={username}>
                        {username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>
                    Map to User
                  </label>
                  <select
                    className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded px-3 py-2 font-mono text-sm focus:border-[var(--primary)] focus:outline-none [box-shadow:var(--shadow-brutal-sm)]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}
                    value={newUserId || ''}
                    onChange={(e) => setNewUserId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleAddMapping}
                    disabled={addingMapping || !newGithubUsername || !newUserId}
                    className="w-full px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] text-[var(--primary-foreground)] font-mono text-sm rounded transition-colors flex items-center justify-center gap-2 border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)] disabled:shadow-none hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <UserPlus className="h-4 w-4" />
                    {addingMapping ? 'ADDING...' : 'ADD MAPPING'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mappings table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <span className="text-[var(--primary)]">$</span>
                <span className="text-[var(--muted-foreground)]">mappings</span>
                <span className="text-[var(--muted-foreground)]">:: count={mappings.length}</span>
              </div>
            </div>

            {mappings.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
                <UserPlus className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No mappings configured for this repository.</p>
                <p className="font-mono text-sm text-[var(--muted-foreground)] mt-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Add a mapping above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-[var(--border)] rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)]">
                      <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>GITHUB USERNAME</th>
                      <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>MAPPED TO</th>
                      <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {mappings.map((mapping) => (
                      <tr key={mapping.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded border-2 border-[var(--accent)]">
                            {mapping.github_username}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>{mapping.name}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">{mapping.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDeleteConfirm({ open: true, mapping })}
                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--destructive)]"
                              title="Delete mapping"
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
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, mapping: null })}
        onConfirm={handleDeleteMapping}
        title="Delete Mapping"
        message={
          <div className="font-mono text-sm">
            <p className="text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Are you sure you want to delete this mapping?</p>
            <p className="text-[var(--accent)]">&gt; {deleteConfirm.mapping?.github_username}</p>
            <p className="text-[var(--muted-foreground)]">&rarr; {deleteConfirm.mapping?.name}</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
