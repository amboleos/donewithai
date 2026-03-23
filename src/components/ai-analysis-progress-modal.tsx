// src/components/ai-analysis-progress-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Loader2, GitCommit, Filter, Brain, CheckCircle } from 'lucide-react';

interface ProgressModalProps {
  isOpen: boolean;
  sourceType: 'commit' | 'branch';
  sourceId: number;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const STAGE_ICONS: Record<string, any> = {
  fetching: GitCommit,
  filtering: Filter,
  formatting: Brain,
  analyzing: Brain,
  completed: CheckCircle,
};

const STAGE_ORDER = ['fetching', 'filtering', 'formatting', 'analyzing', 'completed'];

export default function AnalysisProgressModal({
  isOpen,
  sourceType,
  sourceId,
  onComplete,
  onError,
}: ProgressModalProps) {
  const [stage, setStage] = useState<string>('fetching');
  const [message, setMessage] = useState<string>('Initializing...');

  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'code_analysis_progress') {
          if (data.data.sourceId === sourceId) {
            setStage(data.data.stage);
            setMessage(data.data.message);
          }
        }

        if (data.type === 'code_analysis_completed') {
          if (data.data.sourceId === sourceId) {
            setStage('completed');
            setMessage('Analysis complete!');
            setTimeout(() => {
              onComplete?.(data.data);
              eventSource.close();
            }, 500);
          }
        }

        if (data.type === 'code_analysis_error') {
          setMessage(data.data.error);
          onError?.(data.data.error);
          eventSource.close();
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, sourceId, onComplete, onError]);

  if (!isOpen) return null;

  const StageIcon = STAGE_ICONS[stage] || Loader2;
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const progressPercent = stageIndex >= 0 ? ((stageIndex + 1) / STAGE_ORDER.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-lg)]">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            <Brain className="h-5 w-5 text-[var(--accent)]" />
            CODE ANALYSIS
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] font-mono">
            {sourceType === 'commit' ? `Commit #${sourceId}` : `Branch #${sourceId}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Animation */}
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 border-2 ${
              stage === 'completed'
                ? 'bg-[var(--success)]/10 border-[var(--success)]'
                : 'bg-[var(--accent)]/10 border-[var(--accent)]'
            }`}>
              <StageIcon className={`h-8 w-8 ${
                stage === 'completed' ? 'text-[var(--success)]' : 'text-[var(--accent)]'
              } ${stage !== 'completed' ? 'animate-spin' : ''}`} />
            </div>

            {/* Stage Text */}
            <div className="text-center">
              <div className="text-sm font-bold text-[var(--foreground)] uppercase" style={{ fontFamily: 'Sora, sans-serif' }}>
                {stage}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono mt-1">
                {message}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 border-2 border-[var(--border)] bg-[var(--muted)] overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  stage === 'completed' ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Stage Indicators */}
            <div className="flex items-center gap-2 text-xs font-mono">
              {STAGE_ORDER.slice(0, -1).map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-1 ${
                    stageIndex >= i ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  <div className={`w-2 h-2 ${
                    stageIndex >= i ? 'bg-[var(--accent)]' : 'bg-[var(--muted-foreground)]'
                  }`} />
                  <span className="hidden sm:inline">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
