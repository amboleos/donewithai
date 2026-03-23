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
      <DialogContent className="border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-lg)] max-w-lg">
        <DialogHeader className="border-b-2 border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)]">
              <GitBranch className="h-5 w-5 text-[var(--foreground)]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>Add Repository</DialogTitle>
              <DialogDescription className="text-sm text-[var(--muted-foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                Connect a Git repository to track
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* URL Input */}
          <div className="space-y-3">
            <Label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] font-mono">
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
                className="font-mono text-sm"
              />
              {/* Validation Indicator */}
              {url && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {detection.isValid ? (
                    <div className="p-1 border-2 border-[var(--success)] bg-[var(--success)]/10">
                      <Check className="h-4 w-4 text-[var(--success)]" />
                    </div>
                  ) : (
                    <div className="p-1 border-2 border-[var(--warning)] bg-[var(--warning)]/10">
                      <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detected Provider Info */}
            {detection.provider && (
              <div className="flex items-center gap-3 p-3 border-2 border-[var(--border)] bg-[var(--muted)]">
                {detection.provider === 'github' ? (
                  <>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-sm)]">
                      <GitBranch className="h-4 w-4 text-[var(--foreground)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>GitHub Detected</p>
                      <p className="text-xs text-[var(--muted-foreground)] font-mono">
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 border-2 border-[var(--success)] bg-[var(--success)]/10">
                      <Check className="h-3 w-3 text-[var(--success)]" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-sm)]">
                      <Container className="h-4 w-4 text-[var(--foreground)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>Bitbucket Detected</p>
                      <p className="text-xs text-[var(--muted-foreground)] font-mono">
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 border-2 border-[var(--success)] bg-[var(--success)]/10">
                      <Check className="h-3 w-3 text-[var(--success)]" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bitbucket Token Warning */}
            {detection.provider === 'bitbucket' && detection.tokenEnvVar && (
              <div className="p-4 border-2 border-[var(--warning)] bg-[var(--warning)]/10">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 border-2 border-[var(--warning)] bg-[var(--warning)]/10 shrink-0 mt-0.5">
                    <Info className="h-4 w-4 text-[var(--warning)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--warning)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Environment Variable Required</p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                      Configure this token in your deployment environment:
                    </p>
                    <code className="block text-xs bg-[var(--warning)]/10 border-2 border-[var(--warning)] px-3 py-2 font-mono text-[var(--warning)] break-all">
                      {detection.tokenEnvVar}=your_token_here
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            {!detection.isValid && url && (
              <p className="text-xs text-[var(--warning)] font-mono">
                Please enter a valid GitHub or Bitbucket repository URL
              </p>
            )}
            {!url && (
              <p className="text-xs text-[var(--muted-foreground)] font-mono">
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
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!detection.isValid || loading}
              loading={loading}
            >
              Add Repository
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
