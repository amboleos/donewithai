'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw, Terminal, Cpu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import AdminTabs from '@/components/admin/admin-tabs';

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-green-500 font-mono">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>[INITIALIZING ADMIN CONSOLE]</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      {/* Terminal-style header */}
      <header className="border-b border-green-900/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          {/* Status bar */}
          <div className="flex items-center justify-between text-xs font-mono text-green-500/70 mb-3">
            <div className="flex items-center gap-4">
              <span>SYSTEM: ONLINE</span>
              <span>MODE: ADMINISTRATOR</span>
              <span>TZ: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{clock}</span>
              <span className="text-green-500">● CONNECTED</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Main title bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-500">
              <Terminal className="h-7 w-7" />
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold font-mono text-green-400 tracking-wide">
                ./admin-console
              </h1>
              <p className="text-xs font-mono text-slate-500">
                root@donewithai:~$ manage repos • mappings • ai-flags • keywords • jobs
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
              <Cpu className="h-4 w-4" />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-6">
        {/* Grid background overlay */}
        <div className="relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          <AdminTabs />
        </div>
      </main>
    </div>
  );
}
