'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitBranch, Calendar, Brain, BarChart3, RefreshCw, User, Plus, Minus } from 'lucide-react';
import Link from 'next/link';

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
}

interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  last_synced: string | null;
  created_at: string;
}

export default function RepoDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const repoId = params.id as string;

  const [repo, setRepo] = useState<Repo | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commits' | 'branches' | 'analytics'>('commits');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && repoId) {
      fetchData();
    }
  }, [authLoading, user, router, repoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repoRes, commitsRes, branchesRes, analyticsRes] = await Promise.all([
        fetch(`/api/repos/${repoId}`),
        fetch(`/api/repos/${repoId}/commits`),
        fetch(`/api/repos/${repoId}/branches`),
        fetch(`/api/repos/${repoId}/analytics-mapped?days=30`),
      ]);

      const repoData = await repoRes.json();
      const commitsData = await commitsRes.json();
      const branchesData = await branchesRes.json();
      const analyticsData = await analyticsRes.json();

      setRepo(repoData.repo);
      setCommits(commitsData.commits || []);
      setBranches(branchesData.branches || []);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to fetch repo data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalLinesAdded = commits.reduce((sum, c) => sum + (c.lines_added || 0), 0);
  const totalLinesRemoved = commits.reduce((sum, c) => sum + (c.lines_removed || 0), 0);
  const aiCommits = commits.filter(c => c.is_ai_detected).length;
  const aiBranches = branches.filter(b => b.is_ai_detected).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <GitBranch className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold">{repo?.name || 'Repository'}</span>
            </div>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Commits</CardDescription>
              <CardTitle className="text-3xl">{commits.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI Commits</CardDescription>
              <CardTitle className="text-3xl text-purple-600">{aiCommits}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Plus className="h-3 w-3" /> Lines Added
              </CardDescription>
              <CardTitle className="text-3xl text-green-600">{totalLinesAdded.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Minus className="h-3 w-3" /> Lines Removed
              </CardDescription>
              <CardTitle className="text-3xl text-red-600">{totalLinesRemoved.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'commits' ? 'default' : 'outline'}
            onClick={() => setActiveTab('commits')}
          >
            Commits ({commits.length})
          </Button>
          <Button
            variant={activeTab === 'branches' ? 'default' : 'outline'}
            onClick={() => setActiveTab('branches')}
          >
            Branches ({branches.length})
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'commits' && (
          <Card>
            <CardHeader>
              <CardTitle>Commits</CardTitle>
              <CardDescription>Recent commits in this repository</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commits.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No commits found. Sync the repository to fetch commits.</p>
                ) : (
                  commits.slice(0, 20).map((commit) => (
                    <div key={commit.id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">{commit.author}</span>
                          {commit.is_ai_detected && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{commit.message.split('\n')[0]}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(commit.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-green-600">
                            <Plus className="h-3 w-3" />
                            {commit.lines_added}
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <Minus className="h-3 w-3" />
                            {commit.lines_removed}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'branches' && (
          <Card>
            <CardHeader>
              <CardTitle>Branches</CardTitle>
              <CardDescription>All branches in this repository</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {branches.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No branches found. Sync the repository to fetch branches.</p>
                ) : (
                  branches.map((branch) => (
                    <div key={branch.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium">{branch.name}</span>
                        {branch.is_ai_detected && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            <Brain className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>by {branch.created_by}</span>
                        <span>{new Date(branch.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Developer Stats</CardTitle>
                <CardDescription>Commits and lines changed by developer</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.developerStats?.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No developer stats available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {analytics?.developerStats?.map((dev: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div>
                          <p className="font-medium">{dev.author}</p>
                          <p className="text-sm text-slate-500">{dev.total_commits} commits</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600">+{dev.total_lines_added || 0}</p>
                          <p className="text-sm text-red-600">-{dev.total_lines_removed || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Usage</CardTitle>
                <CardDescription>AI-generated code statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {commits.length > 0 ? Math.round((aiCommits / commits.length) * 100) : 0}%
                  </div>
                  <p className="text-slate-500">of commits detected as AI-generated</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-2xl font-bold">{aiCommits}</p>
                    <p className="text-sm text-slate-500">AI Commits</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <p className="text-2xl font-bold">{aiBranches}</p>
                    <p className="text-sm text-slate-500">AI Branches</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
