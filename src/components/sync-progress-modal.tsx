'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncProgress {
  repoId: number | null;
  repoName: string;
  totalCommits: number;
  processed: number;
  percentage: number;
  currentCommit: string;
  stage: 'fetching' | 'processing' | 'branches' | 'completed';
  aiJobsFound: number;
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
          currentCommit: 'Starting fetch...',
          stage: 'fetching',
          aiJobsFound: 0,
        });
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        console.log('[SyncProgress] Progress:', data);
        setProgress((prev) => ({
          repoId: data.repoId,
          repoName: prev?.repoName || '',
          totalCommits: data.total,
          processed: data.processed,
          percentage: data.percentage,
          currentCommit: data.currentCommit,
          stage: 'processing',
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
      case 'fetching':
        return 'Fetching commits from repository...';
      case 'processing':
        return 'Processing commits and detecting AI...';
      case 'branches':
        return 'Fetching branches...';
      case 'completed':
        return 'Sync completed!';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            {progress.stage === 'completed' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />
            ) : (
              <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
            )}
            <div>
              <CardTitle className="text-lg">
                {progress.stage === 'completed' ? 'Sync Complete!' : 'Syncing...'}
              </CardTitle>
              <p className="text-sm text-slate-500">{progress.repoName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stage text */}
          <p className="text-sm text-slate-600 dark:text-slate-400">{getStageText()}</p>

          {/* Progress bar */}
          {progress.stage !== 'completed' && (
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

          {/* Current commit */}
          {progress.stage === 'processing' && progress.currentCommit && (
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 rounded p-2">
              <span className="font-medium">Current:</span> {progress.currentCommit}
            </div>
          )}

          {/* AI jobs found */}
          {progress.aiJobsFound > 0 && (
            <div className="text-sm text-indigo-600 dark:text-indigo-400">
              🤖 {progress.aiJobsFound} AI-generated commits found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
