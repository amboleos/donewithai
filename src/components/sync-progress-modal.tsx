'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, CheckCircle2, AlertTriangle, GitBranch, Database, Loader2 } from 'lucide-react';

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

// Stage configuration with icons
const STAGE_CONFIG = {
  fetching_commits: {
    icon: Loader2,
    label: 'Fetching Commits',
    description: 'Retrieving commit history from remote repository',
    color: 'blue',
  },
  processing_commits: {
    icon: Database,
    label: 'Processing',
    description: 'Analyzing commits and detecting AI patterns',
    color: 'indigo',
  },
  fetching_branches: {
    icon: GitBranch,
    label: 'Fetching Branches',
    description: 'Retrieving branch information',
    color: 'purple',
  },
  branches_fetched: {
    icon: CheckCircle2,
    label: 'Branches Complete',
    description: 'Branch information retrieved',
    color: 'green',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Complete',
    description: 'Sync finished successfully',
    color: 'green',
  },
  error: {
    icon: AlertTriangle,
    label: 'Error',
    description: 'Sync failed',
    color: 'red',
  },
};

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

// Stage indicator component
function StageIndicator({ currentStage }: { currentStage: SyncProgress['stage'] }) {
  const stages: Array<keyof typeof STAGE_CONFIG> = ['fetching_commits', 'processing_commits', 'fetching_branches', 'branches_fetched'];
  const currentIndex = stages.indexOf(currentStage as keyof typeof STAGE_CONFIG);
  const displayIndex = currentStage === 'completed' ? stages.length : currentStage === 'error' ? -1 : currentIndex;

  return (
    <div className="flex items-center justify-between mb-6">
      {stages.map((stage, index) => {
        const config = STAGE_CONFIG[stage];
        const StageIcon = config.icon;
        const isActive = index === displayIndex;
        const isCompleted = index < displayIndex;

        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 border-2 flex items-center justify-center transition-all
                ${isActive ? 'border-blue-500 bg-blue-500' : isCompleted ? 'border-green-500 bg-green-500' : 'border-slate-300 dark:border-slate-600 bg-transparent'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <StageIcon className={`h-5 w-5 ${isActive ? 'text-white animate-spin' : 'text-slate-400 dark:text-slate-600'}`} />
                )}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 ${isActive ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-slate-400'}`}>
                {config.label.split(' ')[0]}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${index < displayIndex ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SyncProgressModal({ isOpen, progress }: SyncProgressModalProps) {
  if (!isOpen || !progress) return null;

  const config = STAGE_CONFIG[progress.stage];
  const StageIcon = config.icon;
  const isCompleted = progress.stage === 'completed';
  const isError = progress.stage === 'error';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className={`
              p-3 border-2 transition-all
              ${isCompleted ? 'border-green-500 bg-green-500' : isError ? 'border-red-500 bg-red-500' : 'border-blue-500 bg-blue-500'}
            `}>
              <StageIcon className={`h-6 w-6 text-white ${progress.stage === 'fetching_commits' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                {isCompleted ? 'Sync Complete!' : isError ? 'Sync Failed' : 'Syncing...'}
              </h3>
              <p className="text-sm font-mono text-slate-500 dark:text-slate-400 truncate">
                {progress.repoName}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Stage Indicators */}
          {!isError && <StageIndicator currentStage={progress.stage} />}

          {/* Stage Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {config.description}
          </p>

          {/* Progress Bar */}
          {!isCompleted && !isError && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-slate-500 dark:text-slate-400">
                  {progress.processed.toLocaleString()} / {progress.totalCommits.toLocaleString()} commits
                </span>
                <span className="font-bold text-blue-500">{progress.percentage}%</span>
              </div>
              <div className="h-3 border-2 border-slate-300 dark:border-slate-600 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Commit/Status */}
          {(progress.currentCommit && progress.stage !== 'completed' && progress.stage !== 'error') && (
            <div className="p-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Current</p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                {progress.currentCommit}
              </p>
            </div>
          )}

          {/* Branch Info */}
          {progress.stage === 'branches_fetched' && (
            <div className="p-3 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
              <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300 mb-1">Branches Found</p>
              <p className="text-sm font-mono text-green-800 dark:text-green-200">
                {progress.branchesTotal} total, {progress.branchesNew} new
              </p>
            </div>
          )}

          {/* AI Jobs Found */}
          {progress.aiJobsFound > 0 && (
            <div className="p-3 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-1">AI Detected</p>
              <p className="text-sm font-mono text-purple-800 dark:text-purple-200">
                {progress.aiJobsFound.toLocaleString()} AI-generated commits found
              </p>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="p-4 border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950">
              <p className="text-sm font-mono text-red-700 dark:text-red-300">
                {progress.errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
