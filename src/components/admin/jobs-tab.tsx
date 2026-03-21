'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Trophy, TrendingUp } from 'lucide-react';

interface JobReport {
  summary: {
    total_jobs: number;
    total_points: number;
    total_developers: number;
  };
  topContributor: {
    name: string;
    total_points: number;
  } | null;
  byDeveloper: Array<{
    user_id: number;
    user_name: string;
    total_jobs: number;
    total_points: number;
  }>;
}

interface Job {
  id: number;
  repo_name: string;
  user_name: string | null;
  period: string;
  source_type: string;
  points: number;
  detection_method: string;
  created_at: string;
}

export default function JobsTab() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${q}`;
  });
  const [report, setReport] = useState<JobReport | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportRes, jobsRes] = await Promise.all([
        fetch(`/api/ai/jobs?period=${period}&report=true`),
        fetch(`/api/ai/jobs?period=${period}`),
      ]);

      const reportData = await reportRes.json();
      const jobsData = await jobsRes.json();

      setReport(reportData);
      setJobs(jobsData.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { label: 'Current Quarter', value: period },
    { label: 'Q1 2025', value: '2025-Q1' },
    { label: 'Q4 2024', value: '2024-Q4' },
    { label: 'Q3 2024', value: '2024-Q3' },
    { label: 'Q2 2024', value: '2024-Q2' },
  ];

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium">Period:</span>
        {periods.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{report?.summary.total_jobs || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Total Points
            </CardDescription>
            <CardTitle className="text-3xl text-purple-600">{report?.summary.total_points || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Contributor</CardDescription>
            <CardTitle className="text-xl">{report?.topContributor?.name || 'N/A'}</CardTitle>
            <p className="text-sm text-slate-500">{report?.topContributor?.total_points || 0} pts</p>
          </CardHeader>
        </Card>
      </div>

      {/* By Developer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report?.byDeveloper.map((dev, idx) => (
              <div
                key={dev.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-400">#{idx + 1}</span>
                  <span className="font-medium">{dev.user_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">{dev.total_jobs} jobs</span>
                  <Badge className="bg-purple-100 text-purple-700">{dev.total_points} pts</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium">{job.user_name || 'Unassigned'}</p>
                  <p className="text-sm text-slate-500">{job.repo_name} · {job.source_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{job.detection_method}</Badge>
                  <Badge className="bg-green-100 text-green-700">{job.points} pts</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
