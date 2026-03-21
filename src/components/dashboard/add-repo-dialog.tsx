'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => void;
}

export default function AddRepoDialog({ open, onOpenChange, onAdd }: AddRepoDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedProvider, setDetectedProvider] = useState<'github' | 'bitbucket' | null>(null);
  const [tokenEnvVar, setTokenEnvVar] = useState<string>('');

  // Detect provider and generate token env var when URL changes
  useEffect(() => {
    if (!url) {
      setDetectedProvider(null);
      setTokenEnvVar('');
      return;
    }

    // Check for GitHub
    const githubMatch = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
    if (githubMatch) {
      setDetectedProvider('github');
      setTokenEnvVar('');
      return;
    }

    // Check for Bitbucket
    const bitbucketMatch = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/);
    if (bitbucketMatch) {
      setDetectedProvider('bitbucket');
      const repoName = bitbucketMatch[2];
      setTokenEnvVar(`BITBUCKET_TOKEN_${repoName.toUpperCase()}`);
      return;
    }

    setDetectedProvider(null);
    setTokenEnvVar('');
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      toast.error('Please enter a repository URL');
      return;
    }

    // Validate URL
    const githubPattern = /github\.com[:/]([^/]+)\/([^/]+)/;
    const bitbucketPattern = /bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/;

    if (!githubPattern.test(url) && !bitbucketPattern.test(url)) {
      toast.error('Please enter a valid GitHub or Bitbucket repository URL');
      return;
    }

    setLoading(true);
    try {
      await onAdd(url);
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Enter the URL of a GitHub or Bitbucket repository to track
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Repository URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://github.com/owner/repo or https://bitbucket.org/workspace/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-slate-500">
              Supports GitHub and Bitbucket (HTTPS and SSH formats)
            </p>
          </div>

          {detectedProvider === 'bitbucket' && tokenEnvVar && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Configure this environment variable in Vercel:
              </p>
              <code className="text-xs bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded mt-1 block">
                {tokenEnvVar}
              </code>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Repository'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
