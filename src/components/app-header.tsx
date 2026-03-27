'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Brain, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  showBrand?: boolean;
  hideTitle?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  leading,
  actions,
  showBrand = false,
  hideTitle = false,
}: AppHeaderProps) {
  const { user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/verify');
        if (!cancelled) setIsAdmin(res.ok);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <header className="border-b-2 border-[var(--border)] bg-[var(--card)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              </Link>
            )}

            <div className="flex items-center gap-3 min-w-0">
              {showBrand && (
                <>
                  <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)] shrink-0">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col leading-none min-w-0">
                      <span className="text-lg font-bold tracking-tight text-[var(--foreground)] truncate" style={{ fontFamily: 'Sora, sans-serif' }}>
                        DoneWithAI
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-mono truncate">
                        Code Detection System
                      </span>
                    </div>
                  </Link>

                  <div className="hidden sm:block w-px h-10 bg-[var(--border)]" />
                </>
              )}

              <div className="flex items-center gap-3 min-w-0">
                {leading}
                {(!hideTitle || subtitle) && (
                  <div className="min-w-0">
                    {!hideTitle && (
                      <div className="text-xl font-bold text-[var(--foreground)] truncate" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {title}
                      </div>
                    )}
                    {subtitle && (
                      <div
                        className={[
                          hideTitle ? 'text-sm' : 'text-xs',
                          'text-[var(--muted-foreground)] font-mono feather-scrim truncate',
                        ].join(' ')}
                        style={{ fontFamily: 'Sora, sans-serif' }}
                      >
                        {subtitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}

            <ThemeToggle />

            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}

            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="gap-2 [box-shadow:var(--shadow-brutal)] hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:var(--shadow-brutal-sm)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            <div className="px-3 py-1.5 border border-[var(--border)] bg-transparent">
              <span className="text-xs uppercase tracking-widest font-mono text-[var(--muted-foreground)]">
                {user && user.name ? user.name : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

