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
                w-10 h-10 border-2 flex items-center justify-center transition-all rounded-xl
                ${isActive ? 'border-white/50 bg-white/20 backdrop-blur' : isCompleted ? 'border-green-400/50 bg-green-500/20 backdrop-blur' : 'border-white/20 bg-white/5 backdrop-blur'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <StageIcon className={`h-5 w-5 ${isActive ? 'text-white animate-spin' : 'text-white/40'}`} />
                )}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-white/40'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                {config.label.split(' ')[0]}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${index < displayIndex ? 'bg-green-400/50' : 'bg-white/10'}`} />
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
      <div className="w-full max-w-md mx-4 border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className={`
              p-3 border border-white/30 rounded-xl transition-all backdrop-blur
              ${isCompleted ? 'bg-green-500/20' : isError ? 'bg-red-500/20' : 'bg-violet-500/20'}
            `}>
              <StageIcon className={`h-6 w-6 ${isCompleted ? 'text-green-400' : isError ? 'text-red-400' : 'text-white'} ${progress.stage === 'fetching_commits' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold tracking-wide text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {isCompleted ? 'Sync Complete!' : isError ? 'Sync Failed' : 'Syncing...'}
              </h3>
              <p className="text-sm text-white/60 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
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
          <p className="text-sm text-white/70 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            {config.description}
          </p>

          {/* Progress Bar */}
          {!isCompleted && !isError && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="text-white/60">
                  {progress.processed.toLocaleString()} / {progress.totalCommits.toLocaleString()} commits
                </span>
                <span className="font-bold text-white">{progress.percentage}%</span>
              </div>
              <div className="h-3 border border-white/20 bg-white/5 backdrop-blur rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Commit/Status */}
          {(progress.currentCommit && progress.stage !== 'completed' && progress.stage !== 'error') && (
            <div className="p-3 border border-white/20 bg-white/5 backdrop-blur rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Current</p>
              <p className="text-sm text-white/80 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                {progress.currentCommit}
              </p>
            </div>
          )}

          {/* Branch Info */}
          {progress.stage === 'branches_fetched' && (
            <div className="p-3 border border-green-400/30 bg-green-500/10 backdrop-blur rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Branches Found</p>
              <p className="text-sm text-green-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                {progress.branchesTotal} total, {progress.branchesNew} new
              </p>
            </div>
          )}

          {/* AI Jobs Found */}
          {progress.aiJobsFound > 0 && (
            <div className="p-3 border border-pink-400/30 bg-pink-500/10 backdrop-blur rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>AI Detected</p>
              <p className="text-sm text-pink-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                {progress.aiJobsFound.toLocaleString()} AI-generated commits found
              </p>
            </div>
          )}

          {/* Error Message */}
          {isError && (
            <div className="p-4 border border-red-400/30 bg-red-500/10 backdrop-blur rounded-xl">
              <p className="text-sm text-red-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                {progress.errorMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
