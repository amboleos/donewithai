'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Brain, Loader2, Mail, Lock, User, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        if (!formData.name || formData.name.length < 2) {
          throw new Error('Name must be at least 2 characters');
        }
        await register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
      }
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[var(--background)]">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 bg-dots opacity-50" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-10 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-10 -rotate-6" />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-md animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal)] mb-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              DoneWithAI
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm font-mono uppercase tracking-wider">
              {isLogin ? 'Welcome back! Sign in to continue' : 'Create an account to start tracking'}
            </p>
          </div>

          <Card variant="default" className="[box-shadow:var(--shadow-brutal-lg)]">
            <CardContent className="p-6">
              {/* Tab Switcher */}
              <div className="flex border-2 border-[var(--border)] mb-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                    isLogin
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                  }`}
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 border-l-2 border-[var(--border)] ${
                    !isLogin
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                  }`}
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className={`transition-all duration-300 ${isLogin ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground)] mb-2">
                      Name
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                        focusedField === 'name' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                      }`} />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={loading}
                        required
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground)] mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                      focusedField === 'email' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                    }`} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={loading}
                      required
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--foreground)] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                      focusedField === 'password' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
                    }`} />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={loading}
                      required
                      minLength={6}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="pl-10"
                    />
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-2 ml-1">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isLogin ? 'Sign In' : 'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <span className="font-bold text-[var(--primary)]">
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t-2 border-[var(--border)] flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  <span className="text-lg">←</span>
                  <span className="uppercase text-xs font-bold tracking-wider">Back to home</span>
                </Link>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[var(--muted-foreground)]">
            <Terminal className="h-3 w-3" />
            <span className="text-xs font-mono uppercase tracking-wider">
              Secure authentication • End-to-end encrypted
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
