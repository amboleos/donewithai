'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { GitBranch, Container, Check, AlertCircle, Info } from 'lucide-react';

interface AddRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => void;
}

// Provider detection result
interface DetectionResult {
  provider: 'github' | 'bitbucket' | null;
  tokenEnvVar?: string;
  isValid: boolean;
  owner?: string;
  repoName?: string;
}

export default function AddRepoDialog({ open, onOpenChange, onAdd }: AddRepoDialogProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [detection, setDetection] = useState<DetectionResult>({ provider: null, isValid: false });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Detect provider and validate when URL changes
  useEffect(() => {
    if (!url) {
      setDetection({ provider: null, isValid: false });
      return;
    }

    // Check for GitHub
    const githubMatch = url.match(/github\.com[:/]([^/]+)\/([^/]+)/);
    if (githubMatch) {
      setDetection({
        provider: 'github',
        isValid: true,
        owner: githubMatch[1],
        repoName: githubMatch[2],
      });
      return;
    }

    // Check for Bitbucket
    const bitbucketMatch = url.match(/bitbucket\.org[:/]([^/]+)\/([^/.]+?)(\.git)?$/);
    if (bitbucketMatch) {
      setDetection({
        provider: 'bitbucket',
        isValid: true,
        owner: bitbucketMatch[1],
        repoName: bitbucketMatch[2],
        tokenEnvVar: `BITBUCKET_TOKEN_${bitbucketMatch[2].toUpperCase()}`,
      });
      return;
    }

    setDetection({ provider: null, isValid: false });
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      toast.error('Please enter a repository URL');
      return;
    }

    if (!detection.isValid) {
      toast.error('Please enter a valid GitHub or Bitbucket repository URL');
      return;
    }

    setLoading(true);
    try {
      await onAdd(url);
      setUrl('');
      setDetection({ provider: null, isValid: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none">
        <DialogHeader className="border-b-2 border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-blue-500 bg-blue-500">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold uppercase tracking-wide">Add Repository</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                Connect a Git repository to track
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* URL Input */}
          <div className="space-y-3">
            <Label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Repository URL
            </Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="url"
                type="url"
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 rounded-none px-4 py-3 font-mono text-sm focus:border-blue-500 focus:ring-0"
              />
              {/* Validation Indicator */}
              {url && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {detection.isValid ? (
                    <div className="p-1 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600">
                      <Check className="h-4 w-4 text-green-700 dark:text-green-300" />
                    </div>
                  ) : (
                    <div className="p-1 bg-amber-100 dark:bg-amber-900 border border-amber-400 dark:border-amber-600">
                      <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detected Provider Info */}
            {detection.provider && (
              <div className="flex items-center gap-3 p-3 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                {detection.provider === 'github' ? (
                  <>
                    <div className="p-2 border border-slate-400 dark:border-slate-600">
                      <GitBranch className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">GitHub Detected</p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600">
                      <Check className="h-3 w-3 text-green-700 dark:text-green-300" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 border border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950">
                      <Container className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">Bitbucket Detected</p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600">
                      <Check className="h-3 w-3 text-green-700 dark:text-green-300" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bitbucket Token Warning */}
            {detection.provider === 'bitbucket' && detection.tokenEnvVar && (
              <div className="p-4 border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 border border-amber-500 shrink-0 mt-0.5">
                    <Info className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100 uppercase mb-2">Environment Variable Required</p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                      Configure this token in your deployment environment:
                    </p>
                    <code className="block text-xs bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 px-3 py-2 font-mono break-all">
                      {detection.tokenEnvVar}=your_token_here
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            {!detection.isValid && url && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                ⚠ Please enter a valid GitHub or Bitbucket repository URL
              </p>
            )}
            {!url && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports: github.com/owner/repo or bitbucket.org/workspace/repo
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setUrl('');
                setDetection({ provider: null, isValid: false });
              }}
              disabled={loading}
              className="border-2 border-slate-300 dark:border-slate-600 rounded-none px-6 py-2.5 font-bold uppercase tracking-wider text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!detection.isValid || loading}
              className="border-2 border-blue-500 bg-blue-500 text-white rounded-none px-6 py-2.5 font-bold uppercase tracking-wider text-sm hover:bg-transparent hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  Adding...
                </span>
              ) : (
                'Add Repository'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
