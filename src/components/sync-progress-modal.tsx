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
    color: 'violet',
  },
  processing_commits: {
    icon: Database,
    label: 'Processing',
    description: 'Analyzing commits and detecting AI patterns',
    color: 'purple',
  },
  fetching_branches: {
    icon: GitBranch,
    label: 'Fetching Branches',
    description: 'Retrieving branch information',
    color: 'fuchsia',
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
                ${isActive ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : isCompleted ? 'border-[var(--success)] bg-[var(--success)]/20' : 'border-[var(--border)] bg-[var(--muted)]'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                ) : (
                  <StageIcon className={`h-5 w-5 ${isActive ? 'text-white animate-spin' : 'text-[var(--muted-foreground)]'}`} />
                )}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 ${isActive ? 'text-[var(--foreground)]' : isCompleted ? 'text-[var(--success)]' : 'text-[var(--muted-foreground)]'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                {config.label.split(' ')[0]}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${index < displayIndex ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-lg)] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b-2 border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className={`
              p-3 border-2 border-[var(--border)] transition-all
              ${isCompleted ? 'bg-[var(--success)]' : isError ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'}
            `}>
              <StageIcon className={`h-6 w-6 text-white ${progress.stage === 'fetching_commits' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold tracking-wide text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                {isCompleted ? 'Sync Complete!' : isError ? 'Sync Failed' : 'Syncing...'}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] truncate font-mono">
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
          <p className="text-sm text-[var(--muted-foreground)] font-medium" style={{ fontFamily: 'Sora, sans-serif' }}>
            {config.description}
          </p>

          {/* Progress Bar */}
          {!isCompleted && !isError && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-[var(--muted-foreground)]">
                  {progress.processed.toLocaleString()} / {progress.totalCommits.toLocaleString()} commits
                </span>
                <span className="font-bold text-[var(--foreground)]">{progress.percentage}%</span>
              </div>
              <div className="h-4 border-2 border-[var(--border)] bg-[var(--muted)] overflow-hidden relative">
                <div
                  className="h-full bg-[var(--primary)] transition-all duration-300 ease-out relative"
                  style={{ width: `${progress.percentage}%` }}
                >
                  {/* Striped animation */}
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] [animation:stripe-move_1s_linear_infinite]" />
                </div>
              </div>
            </div>
          )}

          {/* Current Commit/Status */}
          {(progress.currentCommit && progress.stage !== 'completed' && progress.stage !== 'error') && (
            <div className="p-4 border-2 border-[var(--border)] bg-[var(--muted)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Current</p>
              <p className="text-sm text-[var(--foreground)] truncate font-mono">
                {progress.currentCommit}
              </p>
            </div>
          )}

          {/* Branch Info */}
          {progress.stage === 'branches_fetched' && (
            <div className="p-4 border-2 border-[var(--success)] bg-[var(--success)]/10">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--success)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Branches Found</p>
              <p className="text-sm text-[var(--foreground)] font-mono">
                {progress.branchesTotal} total, {progress.branchesNew} new
              </p>
            </div>
          )}

          {/* AI Jobs Found */}
          {progress.aiJobsFound > 0 && (
            <div className="p-4 border-2 border-[var(--accent)] bg-[var(--accent)]/10">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>AI Detected</p>
              <p className="text-sm text-[var(--foreground)] font-mono">
                {progress.aiJobsFound.toLocaleString()} AI-generated commits found
              </p>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="p-4 border-2 border-[var(--destructive)] bg-[var(--destructive)]/10">
              <p className="text-sm text-[var(--destructive)] font-mono">
                {progress.errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
