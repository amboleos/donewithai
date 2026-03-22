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
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
    if (pct >= 60) return '#ef4444'; // red
    if (pct >= 40) return '#f59e0b'; // amber
    return '#22c55e'; // green
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
          className="text-slate-200 dark:text-slate-700"
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
          style={{ filter: `drop-shadow(0 0 8px ${getColor(percentage)}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor(percentage) }}>
          {animatedPercentage}%
        </span>
        <span className="text-xs text-slate-500">AI Content</span>
      </div>
    </div>
  );
}

// Mini sparkline chart
function SparklineChart({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
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
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`M 0,100 L ${points.split(' ').map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} L 100,100 Z`}
        fill={`url(#gradient-${color})`}
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
        <span className="font-medium text-sm truncate flex items-center gap-2">
          <User className="h-3 w-3 text-slate-400" />
          {stat.author}
          {stat.originalAuthor && stat.originalAuthor !== stat.author && (
            <span className="text-xs text-slate-400">({stat.originalAuthor})</span>
          )}
        </span>
        <span className="text-sm text-slate-500">{stat.total_commits} commits</span>
      </div>
      <div className="relative h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        {/* Total commits bar */}
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* AI commits overlay */}
        {stat.ai_commits > 0 && (
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out delay-100"
            style={{ width: `${percentage * (aiPercentage / 100)}%` }}
          />
        )}
        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-end px-3">
          <span className="text-xs font-medium text-white drop-shadow">{stat.ai_percentage}% AI</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
        <span className="text-green-600">+{stat.total_lines_added.toLocaleString()}</span>
        <span className="text-red-600">-{stat.total_lines_removed.toLocaleString()}</span>
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
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-slate-200 dark:to-slate-700" />

      <div className="space-y-4">
        {commits.map((commit, idx) => (
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
                  ? 'bg-purple-500 border-purple-300 shadow-lg shadow-purple-500/50'
                  : 'bg-indigo-500 border-indigo-300'
              }`}
            >
              {commit.is_ai_detected && (
                <Sparkles className="h-3 w-3 text-white absolute top-1 left-1 animate-pulse" />
              )}
            </div>

            {/* Commit card */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                expandedCommit === commit.id
                  ? 'bg-slate-50 dark:bg-slate-800 shadow-lg scale-[1.02]'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {commit.sha.substring(0, 7)}
                    </span>
                    {commit.is_ai_detected && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30 animate-pulse-slow">
                        <Brain className="h-3 w-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">
                    {commit.message.split('\n')[0]}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
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
                  <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                    <Plus className="h-3 w-3" />
                    <span className="font-medium">{commit.lines_added}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <Minus className="h-3 w-3" />
                    <span className="font-medium">{commit.lines_removed}</span>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedCommit === commit.id && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
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
  const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'branches' | 'analytics'>('overview');
  const [commitsPage, setCommitsPage] = useState(0);
  const COMMITS_PER_PAGE = 50;
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user && repoId) {
      fetchData();
    }
  }, [user, repoId]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <GitBranch className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{repo.name}</h1>
                  <p className="text-sm text-slate-500">{repo.owner}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
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
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-indigo-100 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Commits
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                <AnimatedCounter value={allCommitsCount} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-indigo-100 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Last synced: {repo.last_synced ? new Date(repo.last_synced).toLocaleDateString() : 'Never'}
              </div>
            </CardContent>
          </Card>

          {/* AI Commits */}
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-purple-100 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Generated
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                <AnimatedCounter value={aiCommits} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-purple-100">
                {aiPercentage}% of all commits
              </div>
            </CardContent>
          </Card>

          {/* Lines Added */}
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-100 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Lines Added
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                <AnimatedCounter value={totalLinesAdded} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-emerald-100 flex items-center gap-1">
                <Code2 className="h-3 w-3" />
                Code growth
              </div>
            </CardContent>
          </Card>

          {/* Lines Removed */}
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-rose-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-rose-100 flex items-center gap-2">
                <Minus className="h-4 w-4" />
                Lines Removed
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                <AnimatedCounter value={totalLinesRemoved} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-rose-100 flex items-center gap-1">
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
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* AI Overview */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI Detection
                  </CardTitle>
                  <CardDescription>AI-generated content analysis</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <AIRingChart percentage={aiPercentage} />
                  <div className="grid grid-cols-2 gap-4 w-full mt-6">
                    <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                      <p className="text-2xl font-bold text-purple-600">{aiCommits}</p>
                      <p className="text-sm text-slate-500">AI Commits</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-pink-50 dark:bg-pink-900/20">
                      <p className="text-2xl font-bold text-pink-600">{aiBranches}</p>
                      <p className="text-sm text-slate-500">AI Branches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    Commit Activity (30 days)
                  </CardTitle>
                  <CardDescription>Daily commit volume and line changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {commitActivity.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-2">Commits per day</p>
                        <SparklineChart data={commitActivity} color="#6366f1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Lines added</p>
                          <SparklineChart data={linesAddedData} color="#22c55e" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Lines removed</p>
                          <SparklineChart data={linesRemovedData} color="#ef4444" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">No activity data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Commits */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-500" />
                    Recent Commits
                  </CardTitle>
                  <CardDescription>Latest {Math.min(10, commits.length)} commits</CardDescription>
                </CardHeader>
                <CardContent>
                  <CommitTimeline commits={commits.slice(0, 10)} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'commits' && (
            <Card>
              <CardHeader>
                <CardTitle>All Commits</CardTitle>
                <CardDescription>
                  Showing {Math.min((commitsPage + 1) * COMMITS_PER_PAGE, allCommitsCount)} of {allCommitsCount} commits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commits.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No commits found. Sync the repository to fetch commits.</p>
                ) : (
                  <>
                    <CommitTimeline commits={paginatedCommits} />

                    {/* Pagination */}
                    {allCommitsCount > COMMITS_PER_PAGE && (
                      <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-indigo-500" />
                  All Branches
                </CardTitle>
                <CardDescription>{branches.length} branches in this repository</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {branches.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No branches found. Sync the repository to fetch branches.</p>
                  ) : (
                    branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="group flex items-center justify-between p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <GitBranch className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium">{branch.name}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>by {branch.created_by}</span>
                              {branch.commit_count && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>{branch.commit_count} commits</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {branch.is_ai_detected && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/30">
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          <span className="text-sm text-slate-500">
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
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    Developer Contributions
                  </CardTitle>
                  <CardDescription>Commits, lines changed, and AI usage by developer</CardDescription>
                </CardHeader>
                <CardContent>
                  {developerStats.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No developer stats available yet.</p>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI Usage by Developer
                  </CardTitle>
                  <CardDescription>Percentage of AI-generated commits per developer</CardDescription>
                </CardHeader>
                <CardContent>
                  {developerStats.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No data available</p>
                  ) : (
                    <div className="space-y-4">
                      {developerStats
                        .sort((a, b) => b.ai_percentage - a.ai_percentage)
                        .slice(0, 10)
                        .map((stat) => (
                          <div key={stat.author} className="flex items-center gap-3">
                            <div className="w-24 text-sm truncate" title={stat.author}>
                              {stat.author}
                            </div>
                            <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  stat.ai_percentage >= 60
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                    : stat.ai_percentage >= 40
                                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{ width: `${Math.max(stat.ai_percentage, 5)}%` }}
                              />
                            </div>
                            <div className="w-12 text-right text-sm font-medium">
                              {stat.ai_percentage}%
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Contributors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Top Contributors
                  </CardTitle>
                  <CardDescription>Most active developers by commit count</CardDescription>
                </CardHeader>
                <CardContent>
                  {developerStats.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No data available</p>
                  ) : (
                    <div className="space-y-3">
                      {developerStats.slice(0, 8).map((stat, idx) => (
                        <div
                          key={stat.author}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{stat.author}</p>
                            <p className="text-xs text-slate-500">{stat.total_commits} commits</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-green-600">+{stat.total_lines_added.toLocaleString()}</p>
                            <p className="text-sm text-red-600">-{stat.total_lines_removed.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-pulse-slow:hover {
          animation: pulse-slow 1s ease-in-out infinite;
        }
      `}</style>
    </div>
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
