'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, GitBranch, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function HomePage() {
  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,245,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

        {/* Scanning Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00f5ff] to-transparent opacity-50 animate-scan" />
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#ff00ff] rounded-full blur-[120px] opacity-20 animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#00f5ff] rounded-full blur-[150px] opacity-15 animate-pulse-slow" style={{ animationDelay: '1s' }} />

        {/* Header */}
        <header className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-md">
          <div className="container mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="h-9 w-9 text-[#00f5ff]" />
                <div className="absolute inset-0 blur-lg bg-[#00f5ff] opacity-50" />
              </div>
              <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                DoneWithAI
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="glow-ai" size="sm" className="gap-2 font-mono text-xs">
                  DASHBOARD <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative z-10 container mx-auto px-6 py-24">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00f5ff]/30 bg-[#00f5ff]/5 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#00f5ff] animate-pulse" />
              <span className="text-sm font-mono text-[#00f5ff]">AI CODE TRACKING PLATFORM</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <span className="block">Track AI Code</span>
              <span className="block bg-gradient-to-r from-[#00f5ff] via-[#a855f7] to-[#ff00ff] bg-clip-text text-transparent animate-gradient">
                In Your Repos
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-mono">
              <span className="text-[#00f5ff]">&gt;</span> Gain visibility into AI-generated code entering your codebase. Track team patterns, analyze commits, and understand your AI adoption.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button variant="glow-ai" size="xl" className="gap-3 font-mono text-sm">
                  <span>INITIALIZE_TRACKING</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="gap-2 font-mono text-sm border-white/20 hover:border-[#ff00ff]/50 hover:bg-[#ff00ff]/10">
                <span>VIEW_DEMO</span>
              </Button>
            </div>
          </div>

          {/* Feature Cards with Staggered Animation */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              {
                icon: GitBranch,
                title: 'MULTI-REPO',
                description: 'Manage multiple repositories with unified analytics dashboard',
                color: '#00f5ff',
                delay: 0,
              },
              {
                icon: Brain,
                title: 'AI DETECTION',
                description: 'Advanced LLM-powered analysis of commits and branches',
                color: '#a855f7',
                delay: 100,
              },
              {
                icon: BarChart3,
                title: 'ANALYTICS',
                description: 'Deep insights with visual charts and developer statistics',
                color: '#ff00ff',
                delay: 200,
              },
              {
                icon: Shield,
                title: 'ADMIN CONTROL',
                description: 'Role-based access with manual AI flag overrides',
                color: '#f97316',
                delay: 300,
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="group border border-white/10 bg-black/40 backdrop-blur-sm hover:border-[#00f5ff]/50 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${feature.delay}ms` }}
                variant="outline"
              >
                <CardContent className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="relative p-3 rounded-lg" style={{ background: `${feature.color}15` }}>
                      <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                      <div className="absolute inset-0 blur-xl opacity-50" style={{ background: feature.color }} />
                    </div>
                  </div>
                  <h3 className="text-center font-bold mb-2 font-mono text-sm" style={{ fontFamily: 'Orbitron, sans-serif', color: feature.color }}>
                    {feature.title}
                  </h3>
                  <p className="text-center text-sm text-slate-400 font-mono">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Terminal-style CTA */}
          <div className="mt-20 max-w-2xl mx-auto">
            <Card className="border border-[#00f5ff]/20 bg-black/60 backdrop-blur-sm">
              <CardContent className="p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-slate-500">terminal</span>
                </div>
                <div className="space-y-2 text-slate-300">
                  <p>
                    <span className="text-[#00f5ff]">$</span> npm install @donewithai/cli
                  </p>
                  <p>
                    <span className="text-[#00f5ff]">$</span> donewithai track <span className="text-slate-500">--repo="your-repo"</span>
                  </p>
                  <p className="text-[#00f5ff] flex items-center gap-2">
                    <span className="inline-block w-2 h-4 bg-[#00f5ff] animate-pulse" />
                    Tracking AI commits...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-6 text-center text-sm text-slate-500 font-mono">
            <span className="text-[#00f5ff]">&lt;</span> DoneWithAI <span className="text-[#ff00ff]">/&gt;</span> — AI Code Tracking Platform
          </div>
        </footer>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 8s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </>
  );
}
