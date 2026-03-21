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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <span className="font-medium">{progress.repoName}</span>
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
            <span className="text-slate-500">
              {progress.processed} / {progress.total} commits
            </span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>

          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {progress.currentCommit && (
            <p className="text-xs text-slate-500 truncate">
              {progress.currentCommit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
