'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, GitBranch, BarChart3, Shield, ArrowRight, Zap, Terminal, Cpu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function HomePage() {
  return (
    <>
      {/* Google Fonts - Sora + JetBrains Mono */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden bg-[var(--background)]">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 bg-dots opacity-50" />

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border-2 border-[var(--accent)] opacity-20 rotate-12" />
        <div className="absolute bottom-40 left-20 w-24 h-24 border-2 border-[var(--primary)] opacity-20 -rotate-6" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-[var(--accent)] opacity-5" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b-2 border-[var(--border)] bg-[var(--card)]">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 border-2 border-[var(--border)] bg-[var(--primary)] [box-shadow:var(--shadow-brutal-sm)]">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    DoneWithAI
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-mono">
                    Code Detection System
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/login">
                  <Button variant="default" size="lg">
                    Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="container mx-auto px-6 py-20">
            <div className="max-w-5xl mx-auto">
              {/* Hero Text */}
              <div className="mb-16 animate-fade-in">
                {/* Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[var(--border)] bg-[var(--card)] mb-6 [box-shadow:var(--shadow-brutal-sm)]">
                  <Zap className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] font-mono">
                    AI Code Tracking Platform
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  <span className="block">Track AI Code</span>
                  <span className="block text-[var(--primary)]">In Your Repos</span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mb-10" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Gain visibility into AI-generated code entering your codebase.
                  Track team patterns, analyze commits, and understand your AI adoption.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link href="/login">
                    <Button variant="default" size="xl">
                      Get Started <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="xl">
                    View Demo
                  </Button>
                </div>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                {[
                  {
                    icon: GitBranch,
                    title: 'Multi-Repo',
                    description: 'Manage multiple repositories with unified analytics',
                    variant: 'default' as const,
                  },
                  {
                    icon: Brain,
                    title: 'AI Detection',
                    description: 'Advanced LLM-powered analysis of commits',
                    variant: 'primary' as const,
                  },
                  {
                    icon: BarChart3,
                    title: 'Analytics',
                    description: 'Deep insights with visual charts and statistics',
                    variant: 'accent' as const,
                  },
                  {
                    icon: Shield,
                    title: 'Admin Control',
                    description: 'Role-based access with manual overrides',
                    variant: 'default' as const,
                  },
                ].map((feature, idx) => (
                  <Card
                    key={idx}
                    variant={feature.variant}
                    className="animate-slide-up"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-start mb-3">
                        <div className="p-2 border-2 border-[var(--border)] bg-[var(--muted)]">
                          <feature.icon className="h-5 w-5 text-[var(--foreground)]" />
                        </div>
                      </div>
                      <h3 className="font-bold mb-1 text-[var(--foreground)] uppercase text-sm tracking-wide" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Terminal-style Demo */}
              <Card variant="bordered" className="max-w-2xl mx-auto animate-fade-in">
                <CardContent className="p-0">
                  {/* Terminal Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--muted)]">
                    <div className="w-3 h-3 border-2 border-[var(--destructive)] bg-[var(--destructive)]" />
                    <div className="w-3 h-3 border-2 border-[var(--warning)] bg-[var(--warning)]" />
                    <div className="w-3 h-3 border-2 border-[var(--success)] bg-[var(--success)]" />
                    <span className="ml-3 text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
                      terminal
                    </span>
                  </div>
                  {/* Terminal Content */}
                  <div className="p-5 font-mono text-sm space-y-2 bg-[var(--card)]">
                    <p className="text-[var(--foreground)]">
                      <span className="text-[var(--primary)]">$</span> npm install @donewithai/cli
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      <span className="text-[var(--success)]">✓</span> Installed successfully
                    </p>
                    <p className="text-[var(--foreground)]">
                      <span className="text-[var(--primary)]">$</span> donewithai track <span className="text-[var(--muted-foreground)]">--repo="your-repo"</span>
                    </p>
                    <p className="text-[var(--foreground)] flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-[var(--accent)] animate-pulse" />
                      <span className="inline-block w-2 h-4 bg-[var(--foreground)] animate-pulse" />
                      <span className="text-[var(--muted-foreground)]">Tracking AI commits...</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t-2 border-[var(--border)] bg-[var(--card)] mt-20">
            <div className="container mx-auto px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="text-sm font-mono text-[var(--muted-foreground)]">
                  DoneWithAI v1.0.0
                </span>
              </div>
              <span className="text-sm text-[var(--muted-foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                AI Code Tracking Platform
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
