'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AddRepoDialog from '@/components/dashboard/add-repo-dialog';
import RepoList from '@/components/dashboard/repo-list';

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

export default function ReposTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  const handleDeleteRepo = async (id: number) => {
    try {
      await fetch(`/api/repos?id=${id}`, { method: 'DELETE' });
      setRepos((prev) => prev.filter((r) => r.id !== id));
      toast.success('Repository deleted');
    } catch {
      toast.error('Failed to delete repository');
    }
  };

  const handleSyncRepo = async (url: string) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to sync');
      toast.success('Repository synced');
      fetchRepos();
    } catch {
      toast.error('Failed to sync repository');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Repositories</CardTitle>
          <Button onClick={() => setAddDialogOpen(true)}>Add Repository</Button>
        </div>
      </CardHeader>
      <CardContent>
        {repos.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No repositories yet</p>
        ) : (
          <RepoList
            repos={repos}
            onDelete={handleDeleteRepo}
            onSync={handleSyncRepo}
          />
        )}
      </CardContent>
      <AddRepoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddRepo}
      />
    </Card>
  );
}
