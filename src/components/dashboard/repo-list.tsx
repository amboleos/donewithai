'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, GitBranch, RefreshCw, Calendar, Container, AlertTriangle } from 'lucide-react';

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
}

export default function RepoList({ repos, onDelete, onSync }: RepoListProps) {
  const getProviderIcon = (provider?: string) => {
    if (provider === 'bitbucket') {
      return <Container className="h-4 w-4 text-blue-600" />;
    }
    return <GitBranch className="h-4 w-4 text-indigo-600" />;
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {repos.map((repo) => (
        <Card key={repo.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getProviderIcon(repo.provider)}
                <CardTitle className="text-lg">{repo.name}</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {repo.sync_error && (
                  <span title={repo.sync_error}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </span>
                )}
                <Badge variant="outline">{repo.owner}</Badge>
              </div>
            </div>
            <CardDescription className="line-clamp-1">
              {repo.url}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Calendar className="h-4 w-4" />
              {repo.last_synced
                ? `Synced ${new Date(repo.last_synced).toLocaleDateString()}`
                : 'Not synced yet'}
            </div>
            <div className="flex gap-2">
              <Link href={`/repo/${repo.id}`} className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  View Details
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSync(repo.url)}
                title="Sync repository"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this repository?')) {
                      onDelete(repo.id);
                    }
                  }}
                  title="Delete repository"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
