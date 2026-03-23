'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PublicUser } from '@/lib/db';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: PublicUser | null;
  onSave: (user: PublicUser) => void;
}

interface FormData {
  name: string;
  email: string;
  github_username: string;
  role: 'admin' | 'developer';
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export function UserDialog({ open, onOpenChange, user, onSave }: UserDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    github_username: '',
    role: 'developer',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const isEditMode = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          github_username: user.github_username || '',
          role: user.role as 'admin' | 'developer',
          password: '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          github_username: '',
          role: 'developer',
          password: '',
        });
      }
      setErrors({});
    }
  }, [open, user]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isEditMode && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/admin/users/${user.id}`
        : '/api/admin/users';

      const method = isEditMode ? 'PUT' : 'POST';

      const body = isEditMode
        ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            github_username: formData.github_username.trim() || null,
          }
        : {
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            role: formData.role,
            github_username: formData.github_username.trim() || null,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      const data = await res.json();
      const savedUser: PublicUser = data.user;

      toast.success(
        isEditMode
          ? `User "${savedUser.name}" updated successfully`
          : `User "${savedUser.name}" created successfully`
      );

      onSave(savedUser);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-2 border-[var(--border)] bg-[var(--card)] [box-shadow:var(--shadow-brutal-lg)] max-w-md">
        <DialogHeader>
          <DialogTitle
            className="font-mono text-lg text-[var(--primary)]"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {isEditMode ? 'EDIT USER' : 'ADD USER'}
          </DialogTitle>
          <DialogDescription
            className="font-mono text-sm text-[var(--muted-foreground)]"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {isEditMode
              ? 'Update user information. Leave password empty to keep current.'
              : 'Create a new user account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Input
              id="name"
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="John Doe"
              disabled={loading}
              autoComplete="name"
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>

          {/* Email */}
          <div>
            <Input
              id="email"
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              placeholder="john@example.com"
              disabled={loading}
              autoComplete="email"
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>

          {/* GitHub Username */}
          <div>
            <Input
              id="github_username"
              label="GitHub Username"
              value={formData.github_username}
              onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
              placeholder="johndoe"
              disabled={loading}
              autoComplete="off"
              hint="Optional"
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>

          {/* Role */}
          <div>
            <label
              className="block font-mono text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--foreground)]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'developer' })}
              disabled={loading}
              className="w-full h-11 px-4 py-2 border-2 border-[var(--border)] bg-[var(--card)] text-sm font-mono rounded [box-shadow:var(--shadow-brutal-sm)] focus-visible:outline-none focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none focus-visible:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}
            >
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="text-xs text-[var(--destructive)] font-semibold uppercase mt-2 flex items-center gap-1">
                <svg className="size-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 0C2.686 0 0 2.686 0 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm-.75 3h1.5v3h-1.5V3zm.75 4.5a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                </svg>
                {errors.role}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <Input
              id="password"
              label={isEditMode ? 'Password (leave empty to keep current)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              placeholder={isEditMode ? '••••••' : '••••••'}
              disabled={loading}
              autoComplete={isEditMode ? 'new-password' : 'new-password'}
              hint={isEditMode ? 'Leave empty to keep current password' : 'Minimum 6 characters'}
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {isEditMode ? 'UPDATE' : 'CREATE'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
