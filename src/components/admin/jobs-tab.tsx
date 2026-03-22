'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Trophy, TrendingUp, Medal, Award, Zap } from 'lucide-react';

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

  const getRankIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Medal className="h-5 w-5 text-yellow-400" />;
      case 1: return <Medal className="h-5 w-5 text-slate-400" />;
      case 2: return <Medal className="h-5 w-5 text-amber-700" />;
      default: return <span className="font-bold text-slate-600">#{idx + 1}</span>;
    }
  };

  const getDetectionMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'keyword': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'llm': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'manual': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 text-green-500 font-mono">
          <Trophy className="h-5 w-5 animate-pulse" />
          <span>[LOADING JOBS REPORT...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-3 rounded border border-slate-800">
        <span className="text-green-500 font-mono text-sm">$</span>
        <span className="font-mono text-sm text-slate-400">period</span>
        <span className="text-slate-600">=</span>
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`
                px-3 py-1 rounded font-mono text-xs transition-colors
                ${period === p.value
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
                }
              `}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-500">Total Jobs</p>
              <p className="text-3xl font-mono font-bold text-green-400 mt-1">
                {report?.summary.total_jobs || 0}
              </p>
            </div>
            <Brain className="h-10 w-10 text-slate-700" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-500">Total Points</p>
              <p className="text-3xl font-mono font-bold text-purple-400 mt-1">
                {report?.summary.total_points || 0}
              </p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-900/50" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-500">Top Contributor</p>
              <p className="text-xl font-mono font-bold text-yellow-400 mt-1">
                {report?.topContributor?.name || 'N/A'}
              </p>
              <p className="text-xs font-mono text-slate-500">
                {report?.topContributor?.total_points || 0} pts
              </p>
            </div>
            <Trophy className="h-10 w-10 text-yellow-600/50" />
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center gap-2 text-sm font-mono text-slate-500 mb-3">
          <span className="text-green-500">$</span>
          <span>leaderboard</span>
          <span className="text-slate-600">:: period={period}</span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          {report?.byDeveloper.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <p className="font-mono text-slate-500">No job data for this period.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-green-900/30">
                  <th className="px-4 py-3 text-left font-mono text-xs text-green-500 w-16">RANK</th>
                  <th className="px-4 py-3 text-left font-mono text-xs text-green-500">DEVELOPER</th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-green-500">JOBS</th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-green-500">POINTS</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {report?.byDeveloper.map((dev, idx) => (
                  <tr
                    key={dev.user_id}
                    className={`
                      border-b border-slate-800 transition-colors
                      ${idx === 0 ? 'bg-yellow-500/5' : 'hover:bg-slate-800/30'}
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {getRankIcon(idx)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={idx === 0 ? 'text-yellow-400 font-bold' : 'text-slate-200'}>
                        {dev.user_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{dev.total_jobs}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {dev.total_points} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Job Details */}
      <div>
        <div className="flex items-center gap-2 text-sm font-mono text-slate-500 mb-3">
          <span className="text-green-500">$</span>
          <span>job_details</span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="font-mono text-sm text-slate-500">No job details available.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-green-900/30">
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500">USER</th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500">REPO</th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500">TYPE</th>
                    <th className="px-4 py-3 text-left font-mono text-xs text-green-500">METHOD</th>
                    <th className="px-4 py-3 text-right font-mono text-xs text-green-500">POINTS</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-200">
                        {job.user_name || <span className="text-slate-500">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{job.repo_name}</td>
                      <td className="px-4 py-3 text-slate-500">{job.source_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${getDetectionMethodColor(job.detection_method)}`}>
                          {job.detection_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">
                          +{job.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
