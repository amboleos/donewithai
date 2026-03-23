'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw, Terminal, Cpu, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import AdminTabs from '@/components/admin/admin-tabs';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [clock, setClock] = useState('');

  useEffect(() => {
    setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="absolute inset-0 bg-dots opacity-50" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-10 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-10 -rotate-6" />

        {/* Content */}
        <div className="relative z-10 pb-10">
          {/* Header */}
          <header className="border-b-2 border-[var(--border)] bg-[var(--card)] sticky top-0 z-40">
            <div className="container mx-auto px-6 py-4">
              {/* Status bar */}
              <div className="flex items-center justify-between text-xs font-mono text-[var(--muted-foreground)] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px]">SYSTEM: ONLINE</span>
                  </span>
                  <span>MODE: ADMINISTRATOR</span>
                  <span>TZ: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>{clock}</span>
                  <span className="text-green-400">CONNECTED</span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Main title bar */}
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <button className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-bold uppercase tracking-wider [box-shadow:var(--shadow-brutal-sm)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:[box-shadow:var(--shadow-brutal)] transition-all">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                </Link>
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <div className="p-2 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]">
                    <Terminal className="h-5 w-5 text-white" />
                  </div>
                  <Shield className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-[var(--foreground)] tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Admin Console
                  </h1>
                  <p className="text-xs text-[var(--muted-foreground)]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Manage repos, mappings, ai-flags, keywords, and jobs
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <Cpu className="h-4 w-4" />
                  <span>v1.0.0</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="container mx-auto px-6 py-6">
            <AdminTabs />
          </main>
        </div>
      </div>
    </>
  );
}
