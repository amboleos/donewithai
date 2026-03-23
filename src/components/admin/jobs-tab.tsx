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
      case 0: return <Medal className="h-5 w-5 text-[var(--warning)]" />;
      case 1: return <Medal className="h-5 w-5 text-[var(--muted-foreground)]" />;
      case 2: return <Medal className="h-5 w-5 text-[var(--warning)]/70" />;
      default: return <span className="font-bold font-mono text-[var(--muted-foreground)]">#{idx + 1}</span>;
    }
  };

  const getDetectionMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'keyword': return 'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]';
      case 'llm': return 'text-[var(--accent)] bg-[var(--accent-light)] border-[var(--accent)]';
      case 'manual': return 'text-[var(--primary)] bg-[var(--primary-light)] border-[var(--primary)]';
      default: return 'text-[var(--muted-foreground)] bg-[var(--muted)] border-[var(--border)]';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex items-center gap-3 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <Trophy className="h-5 w-5 animate-pulse text-[var(--primary)]" />
          <span className="text-[var(--primary)]">[LOADING JOBS REPORT...]</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 bg-[var(--muted)] px-4 py-3 rounded border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        <span className="text-[var(--primary)] font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>$</span>
        <span className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>period</span>
        <span style={{ color: 'var(--muted-foreground)' }}>=</span>
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`
                px-3 py-1 rounded font-mono text-xs transition-colors border-2
                ${period === p.value
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border-transparent'
                }
              `}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>Total Jobs</p>
              <p className="text-3xl font-mono font-bold mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                {report?.summary.total_jobs || 0}
              </p>
            </div>
            <Brain className="h-10 w-10 text-[var(--muted-foreground)]" />
          </div>
        </div>

        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>Total Points</p>
              <p className="text-3xl font-mono font-bold mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                {report?.summary.total_points || 0}
              </p>
            </div>
            <TrendingUp className="h-10 w-10" style={{ color: 'var(--accent-light)' }} />
          </div>
        </div>

        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>Top Contributor</p>
              <p className="text-xl font-mono font-bold mt-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--warning)' }}>
                {report?.topContributor?.name || 'N/A'}
              </p>
              <p className="text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>
                {report?.topContributor?.total_points || 0} pts
              </p>
            </div>
            <Trophy className="h-10 w-10" style={{ color: 'var(--warning-light)' }} />
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center gap-2 text-sm font-mono mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">leaderboard</span>
          <span className="text-[var(--muted-foreground)]">:: period={period}</span>
        </div>

        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden">
          {report?.byDeveloper.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <p className="font-mono text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No job data for this period.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-4 py-3 text-left font-mono text-xs w-16" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>RANK</th>
                  <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>DEVELOPER</th>
                  <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>JOBS</th>
                  <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>POINTS</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {report?.byDeveloper.map((dev, idx) => (
                  <tr
                    key={dev.user_id}
                    className={`
                      border-b-2 border-[var(--border)] transition-colors
                      ${idx === 0 ? 'bg-[var(--warning-light)]' : 'hover:bg-[var(--muted)]'}
                    `}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        {getRankIcon(idx)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={idx === 0 ? 'text-[var(--warning)] font-bold' : 'text-[var(--foreground)]'} style={{ fontFamily: 'Sora, sans-serif' }}>
                        {dev.user_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{dev.total_jobs}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-[var(--accent-light)] text-[var(--accent)] border-2 border-[var(--accent)]">
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
        <div className="flex items-center gap-2 text-sm font-mono mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          <span className="text-[var(--primary)]">$</span>
          <span className="text-[var(--muted-foreground)]">job_details</span>
        </div>

        <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="font-mono text-sm text-[var(--muted-foreground)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>No job details available.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--muted)]">
                  <tr className="border-b-2 border-[var(--border)]">
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>USER</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>REPO</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>TYPE</th>
                    <th className="px-4 py-3 text-left font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>METHOD</th>
                    <th className="px-4 py-3 text-right font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>POINTS</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b-2 border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                      <td className="px-4 py-3 text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {job.user_name || <span className="text-[var(--muted-foreground)]">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{job.repo_name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{job.source_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border-2 ${getDetectionMethodColor(job.detection_method)}`}>
                          {job.detection_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-[var(--primary-light)] text-[var(--primary)] border-2 border-[var(--primary)]">
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
