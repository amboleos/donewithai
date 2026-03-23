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
      <span className="text-3xl font-bold text-white font-mono">
        {display}
      </span>
      <span className="text-xs uppercase tracking-wider text-white/60">{label}</span>
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) {
  return (
    <div className="card-glass p-4">
      <div className="flex items-center gap-4">
        <div className="p-2 border border-white/30 bg-white/10">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <AnimatedCounter value={value} label={label} />
      </div>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

      {/* Floating Orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />

      <div className="relative z-10">
        <header className="border-b border-white/20 bg-white/10 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="h-8 w-40 bg-white/20 rounded animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-8 w-8 bg-white/20 rounded-full animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-12 w-64 bg-white/20 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/20 rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/20 rounded animate-pulse" />
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
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-white/20 bg-white/10 backdrop-blur-lg sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="p-2 border-2 border-white/30 bg-white/20 backdrop-blur-md rounded-xl group-hover:bg-white/30 transition-colors">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      DoneWithAI
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-white/60">Code Detection System</span>
                  </div>
                </Link>

                {/* Nav */}
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <Link href="/admin">
                      <button className="flex items-center gap-2 px-4 py-2 border border-white/30 bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-all rounded-lg">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </button>
                    </Link>
                  )}
                  <ThemeToggle />
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 border border-white/30 bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-all rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                  <div className="px-4 py-2 border border-white/30 bg-white/10 backdrop-blur-md rounded-lg">
                    <span className="text-sm font-mono text-white">{user?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pb-6 border-b border-white/20">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Dashboard
                </h1>
                <p className="text-white/70 font-mono text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Tracking AI-generated code across your repositories
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setAddDialogOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-purple-700 text-sm font-bold uppercase tracking-wider hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all self-start shadow-xl shadow-white/10 rounded-lg"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
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
              <div className="border border-white/20 bg-white/10 backdrop-blur-xl p-16 text-center rounded-2xl">
                <div className="flex justify-center mb-6">
                  <div className="p-6 border border-white/30 bg-white/10 rounded-2xl">
                    <GitBranch className="h-16 w-16 text-white/60" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  No Repositories
                </h2>
                <p className="text-white/70 mb-8 max-w-md mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Add your first repository to start tracking AI-generated code patterns
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setAddDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-bold uppercase tracking-wider hover:bg-white/90 transition-all rounded-lg"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
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
