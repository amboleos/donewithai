'use client';

import { memo } from 'react';
import Link from 'next/link';
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
        <div className="flex items-center gap-2 text-xs font-mono text-red-400">
          <XCircle className="h-3 w-3" />
          <span>SYNC ERROR</span>
        </div>
      );
    }
    if (repo.last_synced) {
      const daysAgo = Math.floor((Date.now() - new Date(repo.last_synced).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo === 0) {
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>SYNCED TODAY</span>
          </div>
        );
      }
      return (
        <div className="text-xs font-mono text-white/50">
          {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
        </div>
      );
    }
    return (
      <div className="text-xs font-mono text-white/40">
        NOT SYNCED
      </div>
    );
  };

  return (
    <div className="group border border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/15 hover:border-white/30 transition-all rounded-2xl overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Provider Icon */}
            <div className="p-2 border border-white/30 bg-white/10 backdrop-blur rounded-lg shrink-0">
              {getProviderIcon()}
            </div>
            {/* Repo Name */}
            <div className="min-w-0">
              <h3 className="font-bold text-white tracking-wide text-sm truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {repo.name}
              </h3>
              <p className="text-xs text-white/60 font-mono truncate">
                {repo.owner}
              </p>
            </div>
          </div>

          {/* Sync Status */}
          {getSyncStatus()}
        </div>

        {/* Error Badge */}
        {repo.sync_error && (
          <div className="mt-3 p-2 border border-red-400/30 bg-red-500/20 backdrop-blur rounded-lg">
            <p className="text-xs text-red-300 font-mono line-clamp-1">
              {repo.sync_error}
            </p>
          </div>
        )}
      </div>

      {/* Card Body - URL */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <p className="text-xs font-mono text-white/50 truncate">
          {repo.url}
        </p>
      </div>

      {/* Card Actions */}
      <div className="p-3 flex items-center gap-2 flex-wrap">
        {/* View Details - Primary Action */}
        <Link href={`/repo/${repo.id}`} className="flex-1 min-w-[140px]">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-purple-700 text-xs font-bold uppercase tracking-wider hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span>View</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </Link>

        {/* Sync Button */}
        <button
          onClick={() => onSync(repo.url)}
          disabled={!canSync}
          title={canSync ? 'Sync repository (incremental)' : 'Sync is on cooldown'}
          className={`p-2.5 border transition-all rounded-lg ${
            canSync
              ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50'
              : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* Admin Actions */}
        {isAdmin && (
          <>
            {onFullSync && (
              <button
                onClick={() => onFullSync(repo.url)}
                title="Full sync (re-fetch all commits)"
                className="p-2.5 border border-violet-400/30 bg-violet-500/20 text-violet-300 hover:bg-violet-500/40 hover:border-violet-400/50 transition-all rounded-lg"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {onRecheckAI && (
              <button
                onClick={() => onRecheckAI(repo.id)}
                title="Re-check AI for all 2026 commits/branches"
                className="p-2.5 border border-pink-400/30 bg-pink-500/20 text-pink-300 hover:bg-pink-500/40 hover:border-pink-400/50 transition-all rounded-lg"
              >
                <Brain className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this repository?')) {
                    onDelete(repo.id);
                  }
                }}
                title="Delete repository"
                className="p-2.5 border border-red-400/30 bg-red-500/20 text-red-300 hover:bg-red-500/40 hover:border-red-400/50 transition-all rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
