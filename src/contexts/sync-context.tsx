'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import type { SyncType } from '@/app/api/events/route';

interface SyncProgress {
  repoId: number;
  repoName: string;
  processed: number;
  total: number;
  percentage: number;
  currentCommit: string;
}

interface SyncContextType {
  progress: SyncProgress | null;
  isConnected: boolean;
}

const SyncContext = createContext<SyncContextType>({
  progress: null,
  isConnected: false,
});

// Extracted function to get sync type label (removes duplication)
function getSyncTypeLabel(syncType: SyncType): string {
  switch (syncType) {
    case 'full':
      return 'Full Sync';
    case 'ai_recheck':
      return 'AI Recheck';
    default:
      return 'Sync';
  }
}

// Helper wrapper for safe event parsing (removes try-catch duplication)
function wrapEventListener<T>(
  handler: (data: T) => void
): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as T;
      handler(data);
    } catch {
      // Ignore parse errors
    }
  };
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let progressTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        // Close current connection and reconnect after delay
        eventSource?.close();
        setTimeout(() => {
          connect();
        }, 5000);
      };

      // Handle named events from server using wrapper helper
      eventSource.addEventListener('sync_starting', wrapEventListener<{ message: string; syncType: SyncType }>((data) => {
        const syncTypeText = getSyncTypeLabel(data.syncType);
        toast.loading(`${syncTypeText} started...`, {
          id: `sync-${data.syncType}`,
          description: data.message,
        });
      }));

      eventSource.addEventListener('sync_completed', wrapEventListener<{ repoId: number; aiJobsFound: number; duration: number; syncType?: SyncType }>((data) => {
        const syncType = data.syncType || 'incremental';
        const syncTypeText = getSyncTypeLabel(syncType);
        toast.success(`${syncTypeText} completed!`, {
          id: `sync-${syncType}`,
          description: `Found ${data.aiJobsFound} AI commits`,
        });
        // Track timeout for cleanup
        progressTimeoutId = setTimeout(() => setProgress(null), 3000);
      }));

      eventSource.addEventListener('sync_error', wrapEventListener<{ error: string; syncType?: SyncType }>((data) => {
        const syncType = data.syncType || 'incremental';
        toast.error('Sync failed', {
          id: `sync-${syncType}`,
          description: data.error,
        });
      }));

      eventSource.addEventListener('processing_commits', wrapEventListener<{ repoId: number; processed: number; total: number; percentage: number; currentCommit: string; repoName?: string }>((data) => {
        setProgress({
          repoId: data.repoId,
          repoName: data.repoName || '',
          processed: data.processed,
          total: data.total,
          percentage: data.percentage,
          currentCommit: data.currentCommit,
        });
      }));
    };

    connect();

    return () => {
      eventSource?.close();
      if (progressTimeoutId) {
        clearTimeout(progressTimeoutId);
      }
    };
  }, []);

  return (
    <SyncContext.Provider value={{ progress, isConnected }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncProgress() {
  return useContext(SyncContext);
}
