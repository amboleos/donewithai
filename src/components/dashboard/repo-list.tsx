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

  const getProviderColor = () => {
    if (repo.provider === 'bitbucket') {
      return 'text-blue-600 dark:text-blue-400 border-blue-500';
    }
    return 'text-slate-900 dark:text-white border-slate-700';
  };

  const getSyncStatus = () => {
    if (repo.sync_error) {
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          <span>SYNC ERROR</span>
        </div>
      );
    }
    if (repo.last_synced) {
      const daysAgo = Math.floor((Date.now() - new Date(repo.last_synced).getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo === 0) {
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>SYNCED TODAY</span>
          </div>
        );
      }
      return (
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
        </div>
      );
    }
    return (
      <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
        NOT SYNCED
      </div>
    );
  };

  return (
    <div className="group border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all">
      {/* Card Header */}
      <div className="p-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Provider Icon */}
            <div className={`p-2 border ${getProviderColor()} shrink-0`}>
              {getProviderIcon()}
            </div>
            {/* Repo Name */}
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wide text-sm truncate">
                {repo.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                {repo.owner}
              </p>
            </div>
          </div>

          {/* Sync Status */}
          {getSyncStatus()}
        </div>

        {/* Error Badge */}
        {repo.sync_error && (
          <div className="mt-3 p-2 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950">
            <p className="text-xs text-red-700 dark:text-red-300 font-mono line-clamp-1">
              {repo.sync_error}
            </p>
          </div>
        )}
      </div>

      {/* Card Body - URL */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
          {repo.url}
        </p>
      </div>

      {/* Card Actions */}
      <div className="p-3 flex items-center gap-2 flex-wrap">
        {/* View Details - Primary Action */}
        <Link href={`/repo/${repo.id}`} className="flex-1 min-w-[140px]">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider hover:bg-transparent hover:text-slate-900 dark:hover:bg-transparent dark:hover:text-white transition-all">
            <span>View</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </Link>

        {/* Sync Button */}
        <button
          onClick={() => onSync(repo.url)}
          disabled={!canSync}
          title={canSync ? 'Sync repository (incremental)' : 'Sync is on cooldown'}
          className={`p-2.5 border-2 transition-all ${
            canSync
              ? 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-500'
              : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
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
                className="p-2.5 border-2 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 dark:hover:bg-indigo-500 dark:hover:text-white dark:hover:border-indigo-500 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {onRecheckAI && (
              <button
                onClick={() => onRecheckAI(repo.id)}
                title="Re-check AI for all 2026 commits/branches"
                className="p-2.5 border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-500 hover:text-white hover:border-purple-500 dark:hover:bg-purple-500 dark:hover:text-white dark:hover:border-purple-500 transition-all"
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
                className="p-2.5 border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white dark:hover:border-red-500 transition-all"
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
