'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-green-600 hover:bg-green-700 text-white',
  };

  const iconColors = {
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-green-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-lg)]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 border-2 ${variant === 'danger' ? 'border-[var(--destructive)] bg-[var(--destructive)]/10' : variant === 'warning' ? 'border-[var(--warning)] bg-[var(--warning)]/10' : 'border-[var(--success)] bg-[var(--success)]/10'}`}>
              <AlertTriangle className={`h-6 w-6 ${iconColors[variant]}`} />
            </div>
            <DialogTitle className="font-mono" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-sm text-[var(--muted-foreground)] mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-mono"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={variantStyles[variant] + ' font-mono'}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
