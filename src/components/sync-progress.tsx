'use client';

import { useSyncProgress } from '@/contexts/sync-context';
import { BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function SyncProgress() {
  const { progress, isConnected } = useSyncProgress();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (progress && !visible) {
      setVisible(true);
    } else if (!progress && visible) {
      // Hide after completion
      const timeout = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [progress, visible]);

  if (!visible || !progress) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <div className="border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal)] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 border-2 border-[var(--primary)] bg-[var(--primary)]/10">
              <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <span className="font-medium font-mono text-[var(--foreground)]">{progress.repoName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted-foreground)] font-mono">
              {progress.processed} / {progress.total} commits
            </span>
            <span className="font-bold font-mono text-[var(--foreground)]">{progress.percentage}%</span>
          </div>

          <div className="h-2 border-2 border-[var(--border)] bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {progress.currentCommit && (
            <p className="text-xs text-[var(--muted-foreground)] font-mono truncate">
              {progress.currentCommit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
