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
        <div className="flex items-center gap-3 text-green-500 font-mono">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>[LOADING MAPPINGS...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Repo selector */}
      <div>
        <div className="flex items-center gap-2 text-sm font-mono text-slate-500 mb-3">
          <span className="text-green-500">$</span>
          <span>select_repo</span>
        </div>
        {repos.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
            <GitBranch className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="font-mono text-slate-500">No repositories available</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 bg-slate-900/50 p-3 rounded border border-slate-800">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => setSelectedRepo(repo.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all
                  ${selectedRepo === repo.id
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }
                `}
              >
                <GitBranch className="h-4 w-4" />
                <span>{repo.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRepo && (
        <>
          {/* Add new mapping */}
          <div>
            <div className="flex items-center gap-2 text-sm font-mono text-slate-500 mb-3">
              <span className="text-green-500">$</span>
              <span>add_mapping</span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-2">
                    GitHub Username (from commits)
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-slate-200 focus:border-green-500 focus:outline-none"
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
                  <label className="block text-xs font-mono text-slate-500 mb-2">
                    Map to User
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-slate-200 focus:border-green-500 focus:outline-none"
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
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-mono text-sm rounded transition-colors flex items-center justify-center gap-2"
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
              <div className="flex items-center gap-2 text-sm font-mono text-slate-500">
                <span className="text-green-500">$</span>
                <span>mappings</span>
                <span className="text-slate-600">:: count={mappings.length}</span>
              </div>
            </div>

            {mappings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
                <UserPlus className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                <p className="font-mono text-slate-500">No mappings configured for this repository.</p>
                <p className="font-mono text-sm text-slate-600 mt-2">Add a mapping above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-green-900/30">
                      <th className="px-4 py-3 text-left font-mono text-xs text-green-500">GITHUB USERNAME</th>
                      <th className="px-4 py-3 text-left font-mono text-xs text-green-500">MAPPED TO</th>
                      <th className="px-4 py-3 text-right font-mono text-xs text-green-500">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                            {mapping.github_username}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-slate-200">{mapping.name}</div>
                            <div className="text-xs text-slate-500">{mapping.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDeleteConfirm({ open: true, mapping })}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
            <p className="text-slate-300 mb-2">Are you sure you want to delete this mapping?</p>
            <p className="text-purple-400">&gt; {deleteConfirm.mapping?.github_username}</p>
            <p className="text-slate-500">&rarr; {deleteConfirm.mapping?.name}</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
