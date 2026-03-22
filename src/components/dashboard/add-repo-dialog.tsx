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
      <DialogContent className="border border-white/20 bg-white/10 backdrop-blur-xl rounded-2xl text-white">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-white/30 bg-white/10 backdrop-blur rounded-xl">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Add Repository</DialogTitle>
              <DialogDescription className="text-sm text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
                Connect a Git repository to track
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* URL Input */}
          <div className="space-y-3">
            <Label htmlFor="url" className="text-xs font-bold uppercase tracking-wider text-white/80">
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
                className="border border-white/20 bg-white/10 backdrop-blur rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              {/* Validation Indicator */}
              {url && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {detection.isValid ? (
                    <div className="p-1 bg-green-500/20 backdrop-blur border border-green-400/30 rounded-lg">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                  ) : (
                    <div className="p-1 bg-amber-500/20 backdrop-blur border border-amber-400/30 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detected Provider Info */}
            {detection.provider && (
              <div className="flex items-center gap-3 p-3 border border-white/20 bg-white/10 backdrop-blur rounded-lg">
                {detection.provider === 'github' ? (
                  <>
                    <div className="p-2 border border-white/30 bg-white/10 backdrop-blur rounded-lg">
                      <GitBranch className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>GitHub Detected</p>
                      <p className="text-xs text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 bg-green-500/20 backdrop-blur border border-green-400/30 rounded-lg">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 border border-blue-400/30 bg-blue-500/20 backdrop-blur rounded-lg">
                      <Container className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Bitbucket Detected</p>
                      <p className="text-xs text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {detection.owner} / {detection.repoName}
                      </p>
                    </div>
                    <div className="p-1.5 bg-green-500/20 backdrop-blur border border-green-400/30 rounded-lg">
                      <Check className="h-3 w-3 text-green-400" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bitbucket Token Warning */}
            {detection.provider === 'bitbucket' && detection.tokenEnvVar && (
              <div className="p-4 border border-amber-400/30 bg-amber-500/20 backdrop-blur rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 border border-amber-400/30 bg-amber-500/20 shrink-0 mt-0.5 rounded-lg">
                    <Info className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-300 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Environment Variable Required</p>
                    <p className="text-xs text-amber-200/80 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Configure this token in your deployment environment:
                    </p>
                    <code className="block text-xs bg-amber-500/20 border border-amber-400/30 px-3 py-2 rounded-lg text-amber-200 break-all" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {detection.tokenEnvVar}=your_token_here
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            {!detection.isValid && url && (
              <p className="text-xs text-amber-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                Please enter a valid GitHub or Bitbucket repository URL
              </p>
            )}
            {!url && (
              <p className="text-xs text-white/50" style={{ fontFamily: 'Inter, sans-serif' }}>
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
              className="border border-white/30 bg-white/10 text-white hover:bg-white/20 rounded-lg px-6 py-2.5 font-bold uppercase tracking-wider text-sm"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!detection.isValid || loading}
              className="bg-white text-purple-700 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] rounded-lg px-6 py-2.5 font-bold uppercase tracking-wider text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-purple-700/30 border-t-purple-700 animate-spin rounded-full" />
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
