'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SyncProgress {
  repoId: number | null;
  repoName: string;
  totalCommits: number;
  processed: number;
  percentage: number;
  currentCommit: string;
  stage: 'fetching_commits' | 'processing_commits' | 'fetching_branches' | 'branches_fetched' | 'completed' | 'error';
  aiJobsFound: number;
  errorMessage?: string;
  branchesTotal?: number;
  branchesNew?: number;
}

interface SyncProgressModalProps {
  isOpen: boolean;
  progress: SyncProgress | null;
}

export function useSyncProgress() {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectEvents = () => {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('connected', () => {
        console.log('[SyncProgress] SSE connected');
      });

      eventSource.addEventListener('sync_started', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Sync started:', data);
        setIsOpen(true);
        setProgress({
          repoId: data.repoId,
          repoName: data.repoName,
          totalCommits: data.totalCommits,
          processed: 0,
          percentage: 0,
          currentCommit: 'Starting...',
          stage: 'fetching_commits',
          aiJobsFound: 0,
        });
      });

      eventSource.addEventListener('fetching_commits', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Fetching commits:', data);
        setProgress((prev) => ({
          ...prev!,
          stage: 'fetching_commits',
          currentCommit: data.message,
        }));
      });

      eventSource.addEventListener('processing_commits', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Processing:', data);
        setProgress((prev) => ({
          repoId: data.repoId,
          repoName: prev?.repoName || '',
          totalCommits: data.total,
          processed: data.processed,
          percentage: data.percentage,
          currentCommit: data.currentCommit,
          stage: 'processing_commits',
          aiJobsFound: prev?.aiJobsFound || 0,
        }));
      });

      eventSource.addEventListener('fetching_branches', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Fetching branches:', data);
        setProgress((prev) => ({
          ...prev!,
          stage: 'fetching_branches',
          currentCommit: data.message,
          percentage: 90,
        }));
      });

      eventSource.addEventListener('branches_fetched', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Branches fetched:', data);
        setProgress((prev) => ({
          ...prev!,
          stage: 'branches_fetched',
          branchesTotal: data.total,
          branchesNew: data.new,
          currentCommit: `Found ${data.total} branches (${data.new} new)`,
        }));
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Progress (legacy):', data);
        setProgress((prev) => ({
          repoId: data.repoId,
          repoName: prev?.repoName || '',
          totalCommits: data.total,
          processed: data.processed,
          percentage: data.percentage,
          currentCommit: data.currentCommit,
          stage: 'processing_commits',
          aiJobsFound: prev?.aiJobsFound || 0,
        }));
      });

      eventSource.addEventListener('sync_completed', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Sync completed:', data);
        setProgress((prev) => ({
          ...prev!,
          stage: 'completed',
          percentage: 100,
          aiJobsFound: data.aiJobsFound,
        }));

        // Close modal after 2 seconds
        setTimeout(() => {
          setIsOpen(false);
          setProgress(null);
        }, 2000);
      });

      eventSource.addEventListener('sync_error', (e) => {
        const data = JSON.parse(e.data);
        console.error('[SyncProgress] Sync error:', data);
        setProgress((prev) => ({
          ...prev!,
          stage: 'error',
          errorMessage: data.error,
        }));

        // Close modal after 3 seconds
        setTimeout(() => {
          setIsOpen(false);
          setProgress(null);
        }, 3000);
      });

      eventSource.onerror = (error) => {
        console.error('[SyncProgress] SSE error:', error);
        if (eventSource) {
          eventSource.close();
        }
        // Retry connection after 3 seconds
        setTimeout(connectEvents, 3000);
      };
    };

    connectEvents();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { isOpen, progress, setIsOpen };
}

export function SyncProgressModal({ isOpen, progress }: SyncProgressModalProps) {
  if (!isOpen || !progress) return null;

  const getStageText = () => {
    switch (progress.stage) {
      case 'fetching_commits':
        return 'Fetching commits from repository...';
      case 'processing_commits':
        return 'Processing commits and detecting AI...';
      case 'fetching_branches':
        return 'Fetching branches...';
      case 'branches_fetched':
        return `Found ${progress.branchesTotal} branches (${progress.branchesNew} new)`;
      case 'completed':
        return 'Sync completed!';
      case 'error':
        return `Error: ${progress.errorMessage}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            {progress.stage === 'completed' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />
            ) : progress.stage === 'error' ? (
              <AlertTriangle className="h-6 w-6 text-red-500" />
            ) : (
              <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
            )}
            <div>
              <CardTitle className="text-lg">
                {progress.stage === 'completed' ? 'Sync Complete!' :
                 progress.stage === 'error' ? 'Sync Failed' :
                 'Syncing...'}
              </CardTitle>
              <p className="text-sm text-slate-500">{progress.repoName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stage text */}
          <p className="text-sm text-slate-600 dark:text-slate-400">{getStageText()}</p>

          {/* Progress bar */}
          {progress.stage !== 'completed' && progress.stage !== 'error' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {progress.processed} / {progress.totalCommits} commits
                </span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Current commit/status message */}
          {(progress.currentCommit || progress.stage === 'fetching_branches' || progress.stage === 'branches_fetched') && (
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 rounded p-2">
              <span className="font-medium">Status:</span> {progress.currentCommit}
            </div>
          )}

          {/* Branch info */}
          {progress.stage === 'branches_fetched' && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              🌿 {progress.branchesTotal} total branches, {progress.branchesNew} new
            </div>
          )}

          {/* AI jobs found */}
          {progress.aiJobsFound > 0 && (
            <div className="text-sm text-indigo-600 dark:text-indigo-400">
              🤖 {progress.aiJobsFound} AI-generated commits found
            </div>
          )}

          {/* Error message */}
          {progress.stage === 'error' && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
              {progress.errorMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
