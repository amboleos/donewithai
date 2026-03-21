'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

export function SyncProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        // Reconnect after delay - check if already closed to avoid duplicates
        setTimeout(() => {
          if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            setProgress(data.data);
          } else if (data.type === 'sync_completed') {
            // Keep final progress for a few seconds, then clear
            setTimeout(() => setProgress(null), 3000);
          }
        } catch (e) {
          // Ignore parse errors for keep-alive
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
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
