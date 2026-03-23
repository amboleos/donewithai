'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, GitBranch, RefreshCw, Calendar, Container, AlertTriangle, RotateCcw, Brain, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

interface Repo {
  id: number;
  name: string;
  url: string;
  owner: string;
  provider: string;
  last_synced: Date | null;
  created_at: Date;
  sync_error: string | null;
}

interface RepoListProps {
  repos: Repo[];
  onDelete?: (id: number) => void;
  onSync: (url: string) => void;
  onFullSync?: (url: string) => void;
  onRecheckAI?: (id: number) => void;
  canSync?: boolean;
  isAdmin?: boolean;
}

// Individual Repo Card
const RepoCard = memo(({ repo, onDelete, onSync, onFullSync, onRecheckAI, canSync, isAdmin }: {
  repo: Repo;
  onDelete?: (id: number) => void;
  onSync: (url: string) => void;
  onFullSync?: (url: string) => void;
  onRecheckAI?: (id: number) => void;
  canSync?: boolean;
  isAdmin?: boolean;
}) => {
  const getProviderIcon = () => {
    if (repo.provider === 'bitbucket') {
      return <Container className="h-4 w-4" />;
    }
    return <GitBranch className="h-4 w-4" />;
  };

  const getSyncStatus = () => {
    if (repo.sync_error) {
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--destructive)]">
          <XCircle className="h-3 w-3" />
          <span className="uppercase tracking-wider">Sync Error</span>
        </div>
      );
    }
    if (repo.last_synced) {
      const daysAgo = Math.floor((Date.now() - new Date(repo.last_synced).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo === 0) {
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--success)]">
            <CheckCircle2 className="h-3 w-3" />
            <span className="uppercase tracking-wider">Synced Today</span>
          </div>
        );
      }
      return (
        <div className="text-xs font-mono text-[var(--muted-foreground)]">
          {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
        </div>
      );
    }
    return (
      <div className="text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
        Not Synced
      </div>
    );
  };

  return (
    <div className="group border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:[box-shadow:var(--shadow-brutal-lg)] transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b-2 border-[var(--border)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Provider Icon */}
            <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)]">
              {getProviderIcon()}
            </div>
            {/* Repo Name */}
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--foreground)] tracking-wide text-sm truncate uppercase" style={{ fontFamily: 'Sora, sans-serif' }}>
                {repo.name}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] font-mono truncate">
                {repo.owner}
              </p>
            </div>
          </div>

          {/* Sync Status */}
          {getSyncStatus()}
        </div>

        {/* Error Badge */}
        {repo.sync_error && (
          <div className="mt-3 p-2 border-2 border-[var(--destructive)] bg-[var(--destructive)]/10">
            <p className="text-xs text-[var(--destructive)] font-mono line-clamp-1">
              {repo.sync_error}
            </p>
          </div>
        )}
      </div>

      {/* Card Body - URL */}
      <div className="px-4 py-3 bg-[var(--muted)] border-b-2 border-[var(--border)]">
        <p className="text-xs font-mono text-[var(--muted-foreground)] truncate">
          {repo.url}
        </p>
      </div>

      {/* Card Actions */}
      <div className="p-3 flex items-center gap-2 flex-wrap">
        {/* View Details - Primary Action */}
        <Link href={`/repo/${repo.id}`} className="flex-1 min-w-[140px]">
          <Button variant="default" size="sm" className="w-full">
            View <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>

        {/* Sync Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSync(repo.url)}
          disabled={!canSync}
          title={canSync ? 'Sync repository (incremental)' : 'Sync is on cooldown'}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Admin Actions */}
        {isAdmin && (
          <>
            {onFullSync && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onFullSync(repo.url)}
                title="Full sync (re-fetch all commits)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {onRecheckAI && (
              <Button
                variant="accent"
                size="icon"
                onClick={() => onRecheckAI(repo.id)}
                title="Re-check AI for all 2026 commits/branches"
              >
                <Brain className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this repository?')) {
                    onDelete(repo.id);
                  }
                }}
                title="Delete repository"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

RepoCard.displayName = 'RepoCard';

export default function RepoList({ repos, onDelete, onSync, onFullSync, onRecheckAI, canSync = true, isAdmin = false }: RepoListProps) {
  if (repos.length === 0) {
    return null;
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {repos.map((repo) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          onDelete={onDelete}
          onSync={onSync}
          onFullSync={onFullSync}
          onRecheckAI={onRecheckAI}
          canSync={canSync}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
