'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  GitBranch,
  Calendar,
  Brain,
  BarChart3,
  RefreshCw,
  User,
  Plus,
  Minus,
  TrendingUp,
  Activity,
  Users,
  Code2,
  Sparkles,
  Clock,
  Flag
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { toast } from 'sonner';
import AIFlagsTab from '@/components/admin/ai-flags-tab';

interface Commit {
  id: number;
  sha: string;
  message: string;
  author: string;
  date: string;
  lines_added: number;
  lines_removed: number;
  is_ai_detected: boolean | null;
}

interface Branch {
  id: number;
  name: string;
  created_by: string;
  created_at: string;
  is_ai_detected: boolean | null;
  commit_count?: number;
  first_commit_date?: string | null;
  last_commit_date?: string | null;
}

interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  last_synced: string | null;
  created_at: string;
}

interface DeveloperStat {
  author: string;
  originalAuthor?: string;
  total_commits: number;
  total_lines_added: number;
  total_lines_removed: number;
  ai_commits: number;
  ai_percentage: number;
}

interface AnalyticsPoint {
  day: string;
  commit_count: number;
  lines_added: number;
  lines_removed: number;
  ai_commits: number;
}

interface RepoData {
  repo: Repo;
  commits: Commit[];
  branches: Branch[];
  analytics: AnalyticsPoint[];
  developerStats: DeveloperStat[];
}

// Animated counter component
function AnimatedCounter({ value, duration = 1500, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(value * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, isVisible]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()} {suffix}
    </span>
  );
}

// AI Ring Chart component
function AIRingChart({ percentage }: { percentage: number }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 300);
    return () => clearTimeout(timer);
  }, [percentage]);

  const getColor = (pct: number) => {
    if (pct >= 60) return 'var(--destructive)'; // red
    if (pct >= 40) return 'var(--warning)'; // amber
    return 'var(--success)'; // green
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 w-40 h-40" viewBox="0 0 150 150">
        {/* Background circle */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-white/20"
        />
        {/* Progress circle */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white font-mono" style={{ color: getColor(percentage) }}>
          {animatedPercentage}%
        </span>
        <span className="text-xs text-white/70 font-mono">AI Content</span>
      </div>
    </div>
  );
}

// Mini sparkline chart
function SparklineChart({ data, color = 'var(--primary)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - ((val - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-16 overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace('var-', '').replace('(', '-').replace(')', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`M 0,100 L ${points.split(' ').map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} L 100,100 Z`}
        fill={`url(#gradient-${color.replace('var-', '').replace('(', '-').replace(')', '')})`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {data.map((val, i) => {
        const x = (i / (data.length - 1 || 1)) * 100;
        const y = 100 - ((val - min) / range) * 80 - 10;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="hover:r-3 transition-all duration-200"
          />
        );
      })}
    </svg>
  );
}

// Developer contribution bar
function DeveloperBar({ stat, maxCommits }: { stat: DeveloperStat; maxCommits: number }) {
  const percentage = (stat.total_commits / maxCommits) * 100;
  const aiPercentage = (stat.ai_commits / stat.total_commits) * 100;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm truncate flex items-center gap-2 text-[var(--foreground)] font-mono">
          <User className="h-3 w-4 text-[var(--muted-foreground)]" />
          {stat.author}
          {stat.originalAuthor && stat.originalAuthor !== stat.author && (
            <span className="text-xs text-[var(--muted-foreground)]">({stat.originalAuthor})</span>
          )}
        </span>
        <span className="text-sm text-[var(--muted-foreground)] font-mono">{stat.total_commits} commits</span>
      </div>
      <div className="relative h-6 bg-[var(--muted)] border-2 border-[var(--border)] rounded-full overflow-hidden">
        {/* Total commits bar */}
        <div
          className="absolute left-0 top-0 h-full bg-[var(--primary)] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* AI commits overlay */}
        {stat.ai_commits > 0 && (
          <div
            className="absolute left-0 top-0 h-full bg-[var(--accent)] rounded-full transition-all duration-700 ease-out delay-100"
            style={{ width: `${percentage * (aiPercentage / 100)}%` }}
          />
        )}
        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-end px-3">
          <span className="text-xs font-medium text-white drop-shadow font-mono">{stat.ai_percentage}% AI</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-[var(--muted-foreground)] font-mono">
        <span className="text-[var(--success)]">+{stat.total_lines_added.toLocaleString()}</span>
        <span className="text-[var(--destructive)]">-{stat.total_lines_removed.toLocaleString()}</span>
      </div>
    </div>
  );
}

// Activity timeline component
function CommitTimeline({ commits }: { commits: Commit[] }) {
  const [expandedCommit, setExpandedCommit] = useState<number | null>(null);

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border)] border-l-2 border-dashed border-[var(--primary)]" />

      <div className="space-y-4">
        {commits.map((commit) => (
          <div
            key={commit.id}
            className="relative pl-10 group"
            onMouseEnter={() => setExpandedCommit(commit.id)}
            onMouseLeave={() => setExpandedCommit(null)}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-2 top-4 w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                commit.is_ai_detected
                  ? 'bg-[var(--accent)] border-[var(--accent)]'
                  : 'bg-[var(--primary)] border-[var(--primary)]'
              }`}
            >
              {commit.is_ai_detected && (
                <Sparkles className="h-3 w-3 text-white absolute top-1 left-1 animate-pulse" />
              )}
            </div>

            {/* Commit card */}
            <div
              className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                expandedCommit === commit.id
                  ? 'bg-[var(--card)] border-[var(--primary)] [box-shadow:var(--shadow-brutal)] scale-[1.02]'
                  : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-[var(--muted)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--foreground)]">
                      {commit.sha.substring(0, 7)}
                    </span>
                    {commit.is_ai_detected && (
                      <Badge variant="default" className="gap-1">
                        <Brain className="h-3 w-3" />
                        AI Generated
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-medium text-[var(--foreground)] mb-2 line-clamp-2">
                    {commit.message.split('\n')[0]}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] flex-wrap font-mono">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(commit.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Lines changed stats */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1 text-[var(--success)] bg-[var(--success)]/10 px-2 py-1 rounded border border-[var(--success)]/30">
                    <Plus className="h-3 w-3" />
                    <span className="font-medium font-mono">{commit.lines_added}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--destructive)] bg-[var(--destructive)]/10 px-2 py-1 rounded border border-[var(--destructive)]/30">
                    <Minus className="h-3 w-3" />
                    <span className="font-medium font-mono">{commit.lines_removed}</span>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedCommit === commit.id && (
                <div className="mt-3 pt-3 border-t-2 border-[var(--border)] animate-in slide-in-from-top-2">
                  <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap font-mono">
                    {commit.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 bg-dots opacity-50" />

      <div className="relative z-10">
        <header className="border-b-2 border-[var(--border)] bg-[var(--card)]">
          <div className="container mx-auto px-6 py-4">
            <div className="h-8 w-48 bg-[var(--muted)] border-2 border-[var(--border)] rounded animate-pulse" />
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[var(--muted)] border-2 border-[var(--border)] rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="bg-[var(--muted)] border-2 border-[var(--border)] rounded-lg p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-[var(--card)] border-2 border-[var(--border)] rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Main content component (client-side data fetching)
function RepoDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const repoId = params.id as string;

  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'branches' | 'analytics' | 'ai-flags'>('overview');
  const [commitsPage, setCommitsPage] = useState(0);
  const COMMITS_PER_PAGE = 50;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAIRechecking, setIsAIRechecking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user && repoId) {
      fetchData();
      checkAdmin();
    }
  }, [user, repoId]);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repoRes, commitsRes, branchesRes, analyticsRes] = await Promise.all([
        fetch(`/api/repos/${repoId}`),
        fetch(`/api/repos/${repoId}/commits?limit=10000`),
        fetch(`/api/repos/${repoId}/branches?stats=true`),
        fetch(`/api/repos/${repoId}/analytics-mapped?days=30`),
      ]);

      const repoData = await repoRes.json();
      const commitsData = await commitsRes.json();
      const branchesData = await branchesRes.json();
      const analyticsData = await analyticsRes.json();

      setData({
        repo: repoData.repo,
        commits: commitsData.commits || [],
        branches: branchesData.branches || [],
        analytics: analyticsData.analytics || [],
        developerStats: analyticsData.developerStats || [],
      });
    } catch (error) {
      console.error('Failed to fetch repo data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  const handleAIRecheck = async () => {
    setIsAIRechecking(true);
    try {
      const res = await fetch('/api/sync/recheck-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: repo.id }),
      });

      if (!res.ok) throw new Error('Failed to recheck AI');

      const data = await res.json();
      toast.success('AI recheck complete');
      // Refresh data to show updated AI flags
      await fetchData();
    } catch (error) {
      console.error('AI recheck failed:', error);
      toast.error('Failed to recheck AI');
    } finally {
      setIsAIRechecking(false);
    }
  };

  if (loading || !data) {
    return <LoadingSkeleton />;
  }

  const { repo, commits, branches, analytics, developerStats } = data;

  const allCommitsCount = commits.length;
  const totalLinesAdded = commits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
  const totalLinesRemoved = commits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
  const aiCommits = commits.filter(c => c.is_ai_detected).length;
  const aiBranches = branches.filter(b => b.is_ai_detected).length;
  const aiPercentage = allCommitsCount > 0 ? Math.round((aiCommits / allCommitsCount) * 100) : 0;
  const maxCommits = developerStats[0]?.total_commits || 1;

  // Prepare chart data
  const commitActivity = analytics.map((a) => a.commit_count);
  const linesAddedData = analytics.map((a) => a.lines_added);
  const linesRemovedData = analytics.map((a) => a.lines_removed);

  // Paginated commits
  const paginatedCommits = commits.slice(
    commitsPage * COMMITS_PER_PAGE,
    (commitsPage + 1) * COMMITS_PER_PAGE
  );

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 bg-dots opacity-50" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-20 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-20 -rotate-6" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b-2 border-[var(--border)] bg-[var(--card)] sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="p-3 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]">
                      <GitBranch className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>{repo.name}</h1>
                      <p className="text-sm text-[var(--muted-foreground)] font-mono">{repo.owner}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  {isAdmin && (
                    <Button
                      onClick={handleAIRecheck}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={isAIRechecking}
                      title="Recheck AI for all commits"
                    >
                      <Brain className={`h-4 w-4 ${isAIRechecking ? 'animate-pulse' : ''}`} />
                      AI Recheck
                    </Button>
                  )}
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            {/* Hero Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Commits */}
              <Card variant="bordered" className="overflow-hidden group">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Activity className="h-4 w-4" />
                    Total Commits
                  </CardDescription>
                  <CardTitle className="text-4xl font-bold text-[var(--foreground)] font-mono">
                    <AnimatedCounter value={allCommitsCount} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-1 font-mono">
                    <TrendingUp className="h-3 w-3" />
                    Last synced: {repo.last_synced ? new Date(repo.last_synced).toLocaleDateString() : 'Never'}
                  </div>
                </CardContent>
              </Card>

              {/* AI Commits */}
              <Card variant="primary" className="overflow-hidden group">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Brain className="h-4 w-4" />
                    AI Generated
                  </CardDescription>
                  <CardTitle className="text-4xl font-bold text-[var(--foreground)] font-mono">
                    <AnimatedCounter value={aiCommits} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[var(--muted-foreground)] font-mono">
                    {aiPercentage}% of all commits
                  </div>
                </CardContent>
              </Card>

              {/* Lines Added */}
              <Card variant="accent" className="overflow-hidden group">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Plus className="h-4 w-4" />
                    Lines Added
                  </CardDescription>
                  <CardTitle className="text-4xl font-bold text-[var(--foreground)] font-mono">
                    <AnimatedCounter value={totalLinesAdded} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-1 font-mono">
                    <Code2 className="h-3 w-3" />
                    Code growth
                  </div>
                </CardContent>
              </Card>

              {/* Lines Removed */}
              <Card variant="bordered" className="overflow-hidden group">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Minus className="h-4 w-4" />
                    Lines Removed
                  </CardDescription>
                  <CardTitle className="text-4xl font-bold text-[var(--foreground)] font-mono">
                    <AnimatedCounter value={totalLinesRemoved} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    Code refactoring
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overview')}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={activeTab === 'commits' ? 'default' : 'outline'}
                onClick={() => setActiveTab('commits')}
                className="gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Commits ({allCommitsCount})
              </Button>
              <Button
                variant={activeTab === 'branches' ? 'default' : 'outline'}
                onClick={() => setActiveTab('branches')}
                className="gap-2"
              >
                <GitBranch className="h-4 w-4" />
                Branches ({branches.length})
              </Button>
              <Button
                variant={activeTab === 'analytics' ? 'default' : 'outline'}
                onClick={() => setActiveTab('analytics')}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Developer Stats
              </Button>
              <Button
                variant={activeTab === 'ai-flags' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ai-flags')}
                className="gap-2"
              >
                <Flag className="h-4 w-4" />
                AI Flags
              </Button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {activeTab === 'overview' && (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* AI Overview */}
                  <Card variant="primary" className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Brain className="h-5 w-5" />
                        AI Detection
                      </CardTitle>
                      <CardDescription className="text-white/80">AI-generated content analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                      <AIRingChart percentage={aiPercentage} />
                      <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        <div className="text-center p-4 rounded-lg border-2 border-white/30 bg-white/10">
                          <p className="text-2xl font-bold text-white font-mono">{aiCommits}</p>
                          <p className="text-sm text-white/70">AI Commits</p>
                        </div>
                        <div className="text-center p-4 rounded-lg border-2 border-white/30 bg-white/10">
                          <p className="text-2xl font-bold text-white font-mono">{aiBranches}</p>
                          <p className="text-sm text-white/70">AI Branches</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Activity Chart */}
                  <Card variant="bordered" className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
                        <Activity className="h-5 w-5 text-[var(--primary)]" />
                        Commit Activity (30 days)
                      </CardTitle>
                      <CardDescription className="text-[var(--muted-foreground)]">Daily commit volume and line changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {commitActivity.length > 0 ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-[var(--muted-foreground)] mb-2 font-mono">Commits per day</p>
                            <SparklineChart data={commitActivity} color="var(--primary)" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)] mb-2 font-mono">Lines added</p>
                              <SparklineChart data={linesAddedData} color="var(--success)" />
                            </div>
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)] mb-2 font-mono">Lines removed</p>
                              <SparklineChart data={linesRemovedData} color="var(--destructive)" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--muted-foreground)] text-center py-8">No activity data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Commits */}
                  <Card variant="bordered" className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
                        <Clock className="h-5 w-5 text-[var(--primary)]" />
                        Recent Commits
                      </CardTitle>
                      <CardDescription className="text-[var(--muted-foreground)]">Latest {Math.min(10, commits.length)} commits</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CommitTimeline commits={commits.slice(0, 10)} />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'commits' && (
                <Card variant="bordered">
                  <CardHeader>
                    <CardTitle className="text-[var(--foreground)]">All Commits</CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">
                      Showing {Math.min((commitsPage + 1) * COMMITS_PER_PAGE, allCommitsCount)} of {allCommitsCount} commits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {commits.length === 0 ? (
                      <p className="text-[var(--muted-foreground)] text-center py-8">No commits found. Sync the repository to fetch commits.</p>
                    ) : (
                      <>
                        <CommitTimeline commits={paginatedCommits} />

                        {/* Pagination */}
                        {allCommitsCount > COMMITS_PER_PAGE && (
                          <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t-2 border-[var(--border)]">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCommitsPage(Math.max(0, commitsPage - 1))}
                              disabled={commitsPage === 0}
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, Math.ceil(allCommitsCount / COMMITS_PER_PAGE)) }, (_, i) => {
                                const pageNum = Math.max(0, Math.min(
                                  Math.ceil(allCommitsCount / COMMITS_PER_PAGE) - 5,
                                  commitsPage - 2
                                )) + i;
                                const totalPages = Math.ceil(allCommitsCount / COMMITS_PER_PAGE);
                                if (pageNum >= totalPages) return null;

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={commitsPage === pageNum ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCommitsPage(pageNum)}
                                  >
                                    {pageNum + 1}
                                  </Button>
                                );
                              })}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCommitsPage(Math.min(Math.floor(allCommitsCount / COMMITS_PER_PAGE), commitsPage + 1))}
                              disabled={(commitsPage + 1) * COMMITS_PER_PAGE >= allCommitsCount}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'branches' && (
                <Card variant="bordered">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
                      <GitBranch className="h-5 w-5 text-[var(--primary)]" />
                      All Branches
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">{branches.length} branches in this repository</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {branches.length === 0 ? (
                        <p className="text-[var(--muted-foreground)] text-center py-8">No branches found. Sync the repository to fetch branches.</p>
                      ) : (
                        branches.map((branch) => (
                          <div
                            key={branch.id}
                            className="group flex items-center justify-between p-4 rounded-lg border-2 border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border-2 border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
                                <GitBranch className="h-5 w-5 text-[var(--primary)]" />
                              </div>
                              <div>
                                <p className="font-medium text-[var(--foreground)]">{branch.name}</p>
                                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] font-mono">
                                  <span>by {branch.created_by}</span>
                                  {branch.commit_count && (
                                    <>
                                      <span className="text-[var(--border)]">|</span>
                                      <span>{branch.commit_count} commits</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {branch.is_ai_detected && (
                                <Badge variant="default" className="gap-1">
                                  <Brain className="h-3 w-3" />
                                  AI
                                </Badge>
                              )}
                              <span className="text-sm text-[var(--muted-foreground)] font-mono">
                                {branch.last_commit_date
                                  ? new Date(branch.last_commit_date).toLocaleDateString()
                                  : new Date(branch.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'analytics' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Developer Stats */}
                  <Card variant="bordered" className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
                        <Users className="h-5 w-5 text-[var(--primary)]" />
                        Developer Contributions
                      </CardTitle>
                      <CardDescription className="text-[var(--muted-foreground)]">Commits, lines changed, and AI usage by developer</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {developerStats.length === 0 ? (
                        <p className="text-[var(--muted-foreground)] text-center py-8">No developer stats available yet.</p>
                      ) : (
                        <div className="space-y-6">
                          {developerStats.map((stat) => (
                            <DeveloperBar key={stat.author} stat={stat} maxCommits={maxCommits} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* AI by Developer */}
                  <Card variant="accent">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Brain className="h-5 w-5" />
                        AI Usage by Developer
                      </CardTitle>
                      <CardDescription className="text-white/80">Percentage of AI-generated commits per developer</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {developerStats.length === 0 ? (
                        <p className="text-white/80 text-center py-8">No data available</p>
                      ) : (
                        <div className="space-y-4">
                          {developerStats
                            .sort((a, b) => b.ai_percentage - a.ai_percentage)
                            .slice(0, 10)
                            .map((stat) => (
                              <div key={stat.author} className="flex items-center gap-3">
                                <div className="w-24 text-sm truncate text-white font-mono" title={stat.author}>
                                  {stat.author}
                                </div>
                                <div className="flex-1 h-4 bg-white/20 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      stat.ai_percentage >= 60
                                        ? 'bg-[var(--destructive)]'
                                        : stat.ai_percentage >= 40
                                          ? 'bg-[var(--warning)]'
                                          : 'bg-[var(--success)]'
                                    }`}
                                    style={{ width: `${Math.max(stat.ai_percentage, 5)}%` }}
                                  />
                                </div>
                                <div className="w-12 text-right text-sm font-medium text-white font-mono">
                                  {stat.ai_percentage}%
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Contributors */}
                  <Card variant="bordered">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
                        <TrendingUp className="h-5 w-5 text-[var(--success)]" />
                        Top Contributors
                      </CardTitle>
                      <CardDescription className="text-[var(--muted-foreground)]">Most active developers by commit count</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {developerStats.length === 0 ? (
                        <p className="text-[var(--muted-foreground)] text-center py-8">No data available</p>
                      ) : (
                        <div className="space-y-3">
                          {developerStats.slice(0, 8).map((stat, idx) => (
                            <div
                              key={stat.author}
                              className="flex items-center gap-3 p-3 rounded-lg border-2 border-[var(--border)]"
                            >
                              <div className="w-8 h-8 rounded-lg border-2 border-[var(--primary)] bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-[var(--foreground)]">{stat.author}</p>
                                <p className="text-xs text-[var(--muted-foreground)] font-mono">{stat.total_commits} commits</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-[var(--success)] font-mono">+{stat.total_lines_added.toLocaleString()}</p>
                                <p className="text-sm text-[var(--destructive)] font-mono">-{stat.total_lines_removed.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'ai-flags' && (
                <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden p-6">
                  <AIFlagsTab isAdmin={isAdmin} repoId={parseInt(repoId)} repoName={repo.name} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// Main page component with Suspense boundary
export default function RepoDetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RepoDetailContent />
    </Suspense>
  );
}
