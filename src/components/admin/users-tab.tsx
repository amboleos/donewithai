'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, ChevronDown, ChevronUp, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserDialog } from './user-dialog';
import { Button } from '@/components/ui/button';
import type { PublicUser } from '@/lib/db';

type SortField = 'name' | 'email' | 'role' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function UsersTab() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [userDialog, setUserDialog] = useState<{ open: boolean; user: PublicUser | null }>({
    open: false,
    user: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: PublicUser | null }>({
    open: false,
    user: null,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
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

  const filteredAndSortedUsers = useMemo(() => {
    return [...users]
      .filter((user) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'email':
            aVal = a.email.toLowerCase();
            bVal = b.email.toLowerCase();
            break;
          case 'role':
            aVal = a.role;
            bVal = b.role;
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
  }, [users, sortField, sortOrder, searchQuery]);

  const handleSaveUser = async (savedUser: PublicUser) => {
    await fetchUsers();
    setUserDialog({ open: false, user: null });
  };

  const handleDeleteUser = async () => {
    const user = deleteConfirm.user;
    if (!user) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      await fetchUsers();
      toast.success(`User "${user.name}" deleted`);
      setDeleteConfirm({ open: false, user: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          ADMIN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border-2 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        DEVELOPER
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING USERS...]</span>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-4">
      {/* Header with stats and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">users</span>
          <span className="text-[var(--muted-foreground)]">:: total={users.length}</span>
          <span className="text-[var(--muted-foreground)]">:: admins={adminCount}</span>
        </div>
        <Button
          onClick={() => setUserDialog({ open: true, user: null })}
          variant="default"
          className="font-mono text-xs"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD_USER
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--muted)] px-3 py-2 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          type="text"
          placeholder="Filter users by name or email..."
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

      {/* Users table */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-lg">
          <Users className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {searchQuery ? 'No matching users found.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[var(--border)] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('name')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">NAME <SortIndicator field="name" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('email')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">EMAIL <SortIndicator field="email" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('role')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">ROLE <SortIndicator field="role" /></div>
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  GITHUB
                </th>
                <th className="px-4 py-3 text-left font-mono text-xs cursor-pointer hover:text-[var(--primary)]" onClick={() => handleSort('created_at')} style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  <div className="flex items-center gap-1">CREATED <SortIndicator field="created_at" /></div>
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded border-2 border-[var(--primary)]">
                      {user.email}
                    </code>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">
                    {user.github_username ? (
                      <code className="text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded border-2 border-[var(--accent)]">
                        {user.github_username}
                      </code>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setUserDialog({ open: true, user })}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded transition-colors border-2 border-transparent hover:border-[var(--primary)]"
                        title="Edit user"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ open: true, user })}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded transition-colors border-2 border-transparent hover:border-[var(--destructive)]"
                        title="Delete user"
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

      {/* User Dialog */}
      <UserDialog
        open={userDialog.open}
        onOpenChange={(open) => setUserDialog({ open, user: null })}
        user={userDialog.user}
        onSave={handleSaveUser}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, user: null })}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={
          <div className="font-mono text-sm">
            <p className="text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              Are you sure you want to delete this user?
            </p>
            <p className="text-[var(--success)]">&gt; "{deleteConfirm.user?.name}"</p>
            <p className="text-[var(--success)]">&gt; {deleteConfirm.user?.email}</p>
            <p className="text-[var(--muted-foreground)] mt-2">This action cannot be undone.</p>
          </div>
        }
        confirmText="DELETE"
        cancelText="CANCEL"
      />
    </div>
  );
}
