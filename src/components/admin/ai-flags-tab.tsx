'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitBranch, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Commit {
  id: number;
  sha: string;
  message: string;
  author: string;
  repo_id: number;
  is_ai_detected: boolean | null;
  repo_name: string;
}

interface Branch {
  id: number;
  name: string;
  repo_id: number;
  is_ai_detected: boolean | null;
  repo_name: string;
}

export default function AIFlagsTab() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commits' | 'branches'>('commits');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/all?limit=100');
      if (!res.ok) throw new Error('Failed to fetch admin data');

      const data = await res.json();
      setCommits(data.commits || []);
      setBranches(data.branches || []);
    } catch (error) {
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAI = async (type: 'commit' | 'branch', id: number, currentValue: boolean | null) => {
    try {
      const res = await fetch('/api/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, isAI: !currentValue }),
      });

      if (!res.ok) throw new Error('Failed to toggle');

      toast.success(`${type} AI flag updated`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update AI flag');
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
    <div>
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Commits</CardDescription>
            <CardTitle className="text-3xl">{commits.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Branches</CardDescription>
            <CardTitle className="text-3xl">{branches.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI Detected</CardDescription>
            <CardTitle className="text-3xl text-purple-600">
              {commits.filter(c => c.is_ai_detected).length + branches.filter(b => b.is_ai_detected).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'commits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('commits')}
        >
          <GitBranch className="h-4 w-4 mr-2" />
          Commits
        </Button>
        <Button
          variant={activeTab === 'branches' ? 'default' : 'outline'}
          onClick={() => setActiveTab('branches')}
        >
          <GitBranch className="h-4 w-4 mr-2" />
          Branches
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'commits' && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Commit AI Flags</CardTitle>
            <CardDescription>Manually toggle AI detection for commits</CardDescription>
          </CardHeader>
          <CardContent>
            {commits.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No commits to manage. Add repositories first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map((commit) => (
                  <div key={commit.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{commit.message.split('\n')[0]}</p>
                      <p className="text-xs text-slate-500">{commit.author} • {commit.sha.substring(0, 7)} • {commit.repo_name}</p>
                    </div>
                    <Button
                      variant={commit.is_ai_detected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleAI('commit', commit.id, commit.is_ai_detected)}
                    >
                      {commit.is_ai_detected ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          AI
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Human
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'branches' && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Branch AI Flags</CardTitle>
            <CardDescription>Manually toggle AI detection for branches</CardDescription>
          </CardHeader>
          <CardContent>
            {branches.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No branches to manage. Add repositories first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">{branch.name}</span>
                      <span className="text-xs text-slate-500">• {branch.repo_name}</span>
                    </div>
                    <Button
                      variant={branch.is_ai_detected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleAI('branch', branch.id, branch.is_ai_detected)}
                    >
                      {branch.is_ai_detected ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          AI
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Human
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
