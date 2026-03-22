'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, Mail, Lock, User } from 'lucide-react';
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
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

        {/* Glass Card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              DoneWithAI
            </h1>
            <p className="text-white/70 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              {isLogin ? 'Welcome back! Sign in to continue' : 'Create an account to start tracking'}
            </p>
          </div>

          <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl animate-fade-in-up">
            <CardContent className="p-8">
              {/* Tab Switcher */}
              <div className="flex bg-black/20 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isLogin
                      ? 'bg-white text-purple-700 shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    !isLogin
                      ? 'bg-white text-purple-700 shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className={`space-y-2 transition-all duration-300 ${isLogin ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                    <Label htmlFor="name" className="text-white/90 text-sm font-medium">
                      Name
                    </Label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                        focusedField === 'name' ? 'text-purple-400' : 'text-white/40'
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
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90 text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                      focusedField === 'email' ? 'text-purple-400' : 'text-white/40'
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
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                      focusedField === 'password' ? 'text-purple-400' : 'text-white/40'
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
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-purple-400 focus:ring-purple-400/20 transition-all"
                    />
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-white/50 ml-1">Must be at least 6 characters</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-white text-purple-700 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold shadow-xl shadow-white/10"
                  disabled={loading}
                  style={{ fontFamily: 'Outfit, sans-serif' }}
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

                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-white/70 hover:text-white transition-colors duration-200"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <span className="font-semibold text-white underline underline-offset-4 hover:underline-offset-2 transition-all">
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Theme Toggle & Back to home */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors duration-200"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <span>←</span> Back to home
                </Link>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-white/40 text-xs mt-6 font-mono">
            Secure authentication • End-to-end encrypted
          </p>
        </div>

        {/* Custom Styles */}
        <style jsx global>{`
          @keyframes float-1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.05); }
            66% { transform: translate(-20px, 20px) scale(0.95); }
          }
          @keyframes float-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-30px, 20px) scale(1.1); }
            66% { transform: translate(20px, -20px) scale(0.9); }
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-float-1 {
            animation: float-1 20s ease-in-out infinite;
          }
          .animate-float-2 {
            animation: float-2 25s ease-in-out infinite;
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}
