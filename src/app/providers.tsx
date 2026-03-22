'use client';

import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { SyncProvider } from '@/contexts/sync-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { SyncProgress } from '@/components/sync-progress';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          {children}
          <SyncProgress />
          <Toaster />
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
