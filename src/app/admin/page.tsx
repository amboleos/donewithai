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
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30" />

        <div className="relative z-10 flex items-center gap-3 text-white font-mono">
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
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

        {/* Content */}
        <div className="relative z-10 pb-10">
          {/* Header */}
          <header className="border-b border-white/20 bg-white/10 backdrop-blur-lg sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
              {/* Status bar */}
              <div className="flex items-center justify-between text-xs font-mono text-white/60 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    SYSTEM: ONLINE
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
                  <button className="flex items-center gap-2 px-3 py-2 border border-white/30 bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-all rounded-lg">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                </Link>
                <div className="flex items-center gap-2 text-white">
                  <div className="p-2 border border-white/30 bg-white/10 backdrop-blur-md rounded-lg">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <Shield className="h-6 w-6 text-white/80" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Admin Console
                  </h1>
                  <p className="text-xs text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Manage repos, mappings, ai-flags, keywords, and jobs
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50" style={{ fontFamily: 'Inter, sans-serif' }}>
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

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 20px) scale(1.1); }
          66% { transform: translate(20px, -20px) scale(0.9); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1); }
        }
        .animate-float-1 {
          animation: float-1 20s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-2 25s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
