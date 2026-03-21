'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GitBranch, BarChart3, Brain, RefreshCw, Shield, LogOut } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import RepoList from '@/components/dashboard/repo-list';
import AddRepoDialog from '@/components/dashboard/add-repo-dialog';

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

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const canSync = !lastSync || Date.now() - lastSync > 15 * 60 * 1000;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchRepos();
      checkAdmin();
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const stored = localStorage.getItem('lastSyncTime');
    if (stored) {
      setLastSync(parseInt(stored));
    }
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (error) {
      toast.error('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

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
      toast.success('Repository added successfully');
    } catch (error) {
      toast.error('Failed to add repository');
    }
  };

  const handleDeleteRepo = async (id: number) => {
    try {
      await fetch(`/api/repos?id=${id}`, { method: 'DELETE' });
      setRepos((prev) => prev.filter((r) => r.id !== id));
      toast.success('Repository deleted');
    } catch (error) {
      toast.error('Failed to delete repository');
    }
  };

  const handleSyncRepo = async (url: string) => {
    if (!canSync) {
      const minutesLeft = Math.ceil((15 * 60 * 1000 - (Date.now() - lastSync!)) / 60000);
      toast.error(`Please wait ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} before syncing again`);
      return;
    }

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to sync repo');

      localStorage.setItem('lastSyncTime', Date.now().toString());
      setLastSync(Date.now());
      toast.success('Repository synced successfully');
      fetchRepos();
    } catch (error) {
      toast.error('Failed to sync repository');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold">DoneWithAI</span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {user?.name}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage your repositories and view AI analytics
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Repository
            </Button>
          )}
        </div>

        {repos.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No repositories yet</CardTitle>
              <CardDescription>
                Add your first repository to start tracking AI-generated code
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <RepoList
            repos={repos}
            onDelete={isAdmin ? handleDeleteRepo : undefined}
            onSync={handleSyncRepo}
            canSync={canSync}
          />
        )}
      </main>

      <AddRepoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddRepo}
      />
    </div>
  );
}
