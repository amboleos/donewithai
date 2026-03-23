'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GitBranch, BarChart3, Brain, RefreshCw, Shield, LogOut, GitFork, Database, Activity, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { toast } from 'sonner';
import RepoList from '@/components/dashboard/repo-list';
import AddRepoDialog from '@/components/dashboard/add-repo-dialog';
import { SyncProgressModal, useSyncProgress } from '@/components/sync-progress-modal';

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

interface RepoStats {
  totalRepos: number;
  githubRepos: number;
  bitbucketRepos: number;
  recentlySynced: number;
}

// Animated counter component
function AnimatedCounter({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col">
      <span className="text-3xl font-bold text-[var(--foreground)] font-mono">
        {display}
      </span>
      <span className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <div className="border-2 border-[var(--border)] bg-[var(--card)] p-4 [box-shadow:var(--shadow-brutal)]">
      <div className="flex items-center gap-4">
        <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)]">
          <Icon className="h-5 w-5 text-[var(--foreground)]" />
        </div>
        <AnimatedCounter value={value} label={label} />
      </div>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 bg-dots opacity-50" />

      <div className="relative z-10">
        <header className="border-b-2 border-[var(--border)] bg-[var(--card)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="h-8 w-40 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse" />
              <div className="h-8 w-8 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-12 w-64 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[var(--muted)] border-2 border-[var(--border)] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const { isOpen: syncInProgress, progress: syncProgress } = useSyncProgress();

  const canSync = !lastSync || Date.now() - lastSync > 15 * 60 * 1000;

  // Calculate stats from repos
  const stats = useMemo<RepoStats>(() => ({
    totalRepos: repos.length,
    githubRepos: repos.filter(r => r.provider === 'github').length,
    bitbucketRepos: repos.filter(r => r.provider === 'bitbucket').length,
    recentlySynced: repos.filter(r => {
      if (!r.last_synced) return false;
      const daysSinceSync = (Date.now() - new Date(r.last_synced).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSync <= 7;
    }).length,
  }), [repos]);

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

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (error) {
      toast.error('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/verify');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const handleAddRepo = useCallback(async (url: string) => {
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
  }, []);

  const handleDeleteRepo = useCallback(async (id: number) => {
    try {
      await fetch(`/api/repos?id=${id}`, { method: 'DELETE' });
      setRepos((prev) => prev.filter((r) => r.id !== id));
      toast.success('Repository deleted');
    } catch (error) {
      toast.error('Failed to delete repository');
    }
  }, []);

  const handleSyncRepo = useCallback(async (url: string) => {
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
      setTimeout(fetchRepos, 3000);
    } catch (error) {
      toast.error('Failed to sync repository');
    }
  }, [canSync, lastSync, fetchRepos]);

  const handleFullSyncRepo = useCallback(async (url: string) => {
    if (!canSync) {
      const minutesLeft = Math.ceil((15 * 60 * 1000 - (Date.now() - lastSync!)) / 60000);
      toast.error(`Please wait ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''} before syncing again`);
      return;
    }

    const confirmed = confirm('Full sync will re-fetch ALL commits from the repository. This may take longer. Continue?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, fullSync: true }),
      });

      if (!res.ok) throw new Error('Failed to sync repo');

      localStorage.setItem('lastSyncTime', Date.now().toString());
      setLastSync(Date.now());
      toast.info('Full sync started - this will take longer than usual');
      setTimeout(fetchRepos, 5000);
    } catch (error) {
      toast.error('Failed to sync repository');
    }
  }, [canSync, lastSync, fetchRepos]);

  const handleRecheckAI = useCallback(async (id: number) => {
    try {
      const res = await fetch('/api/sync/recheck-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: id }),
      });

      if (!res.ok) throw new Error('Failed to recheck AI');

      toast.success('AI re-check started for 2026 commits');
      setTimeout(fetchRepos, 2000);
    } catch (error) {
      toast.error('Failed to recheck AI');
    }
  }, [fetchRepos]);

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Google Fonts - Sora + JetBrains Mono */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 bg-dots opacity-50" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-20 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-20 -rotate-6" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-[var(--accent)] opacity-5" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b-2 border-[var(--border)] bg-[var(--card)] sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="p-2 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                      DoneWithAI
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-mono">Code Detection System</span>
                  </div>
                </Link>

                {/* Nav */}
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <Link href="/admin">
                      <button className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--muted)] transition-all [box-shadow:var(--shadow-brutal-sm)]">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </button>
                    </Link>
                  )}
                  <ThemeToggle />
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--muted)] transition-all [box-shadow:var(--shadow-brutal-sm)]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                  <div className="px-4 py-2 border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-sm)]">
                    <span className="text-sm font-mono text-[var(--foreground)]">{user?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-6 border-b-2 border-[var(--border)]">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Dashboard
                </h1>
                <p className="text-[var(--muted-foreground)] font-mono text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Tracking AI-generated code across your repositories
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white text-sm font-bold uppercase tracking-wider hover:bg-[var(--primary)]/90 hover:scale-[1.02] active:scale-[0.98] transition-all self-start [box-shadow:var(--shadow-brutal)]"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  <Plus className="h-4 w-4" />
                  Add Repository
                </button>
              )}
            </div>

            {/* Stats Grid */}
            {repos.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Database} label="Total Repos" value={stats.totalRepos} />
                <StatCard icon={GitBranch} label="GitHub" value={stats.githubRepos} />
                <StatCard icon={GitFork} label="Bitbucket" value={stats.bitbucketRepos} />
                <StatCard icon={Activity} label="Synced (7d)" value={stats.recentlySynced} />
              </div>
            )}

            {/* Empty State */}
            {repos.length === 0 ? (
              <div className="border-2 border-[var(--border)] bg-[var(--card)] p-16 text-center [box-shadow:var(--shadow-brutal)]">
                <div className="flex justify-center mb-6">
                  <div className="p-6 border-2 border-[var(--border)] bg-[var(--muted)]">
                    <GitBranch className="h-16 w-16 text-[var(--muted-foreground)]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                  No Repositories
                </h2>
                <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Add your first repository to start tracking AI-generated code patterns
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setAddDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--primary)] text-white font-bold uppercase tracking-wider hover:bg-[var(--primary)]/90 transition-all [box-shadow:var(--shadow-brutal)]"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    <Plus className="h-5 w-5" />
                    Add Your First Repository
                  </button>
                )}
              </div>
            ) : (
              /* Repo List */
              <RepoList
                repos={repos}
                onDelete={isAdmin ? handleDeleteRepo : undefined}
                onSync={handleSyncRepo}
                onFullSync={isAdmin ? handleFullSyncRepo : undefined}
                onRecheckAI={isAdmin ? handleRecheckAI : undefined}
                canSync={canSync}
                isAdmin={isAdmin}
              />
            )}
          </main>
        </div>

        {/* Dialogs */}
        <AddRepoDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onAdd={handleAddRepo}
        />

        <SyncProgressModal isOpen={syncInProgress} progress={syncProgress} />
      </div>
    </>
  );
}
