'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />;
    }
    return resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (theme === 'system') {
      return 'System';
    }
    return resolvedTheme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="relative overflow-hidden border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
      title={`Theme: ${getLabel()} (click to cycle)`}
    >
      <span className="relative z-10 transition-transform duration-300 hover:rotate-12">
        {getIcon()}
      </span>
      {/* Animated background glow */}
      <span className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
    </Button>
  );
}

// Compact version for inline use (text + icon)
export function ThemeToggleCompact() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button
      onClick={() => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
      }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10"
      title={`Current: ${theme === 'system' ? 'System' : resolvedTheme} mode`}
    >
      {theme === 'system' ? (
        <Monitor className="h-4 w-4" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {theme === 'system' ? 'Auto' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
