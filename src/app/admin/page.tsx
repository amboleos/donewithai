'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw } from 'lucide-react';
import AdminTabs from '@/components/admin/admin-tabs';
import { AppHeader } from '@/components/app-header';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      checkAdmin();
    }
  }, [authLoading, user, router]);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

        <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[var(--background)]">
          {/* Dot Pattern */}
          <div className="absolute inset-0 bg-dots opacity-50" />

          <div className="relative z-10 flex items-center gap-3 text-[var(--foreground)] font-mono">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-sm uppercase tracking-wider">[INITIALIZING ADMIN CONSOLE]</span>
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
        {/* Dot Pattern */}
        <div className="absolute inset-0 bg-dots opacity-20" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-10 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-10 -rotate-6" />

        {/* Content */}
        <div className="relative z-10 pb-10">
          <AppHeader
            title="Admin Console"
            subtitle="Manage repos, mappings, ai-flags, keywords, and jobs"
            backHref="/dashboard"
            leading={
              <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)]">
                <Shield className="h-5 w-5 text-[var(--primary)]" />
              </div>
            }
          />

          {/* Main content */}
          <main className="container mx-auto px-6 py-6">
            <AdminTabs />
          </main>
        </div>
      </div>
    </>
  );
}
