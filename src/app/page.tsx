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
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />

        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-pink-400 rounded-full blur-[100px] opacity-40 animate-float-1" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-[120px] opacity-30 animate-float-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400 rounded-full blur-[150px] opacity-20 animate-pulse-slow" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQgMEgwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="border-b border-white/20 bg-white/10 backdrop-blur-lg">
            <div className="container mx-auto px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 border-2 border-white/30 bg-white/20 backdrop-blur-md rounded-xl">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  DoneWithAI
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/login">
                  <Button className="gap-2 bg-white text-purple-700 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/10" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="container mx-auto px-6 py-24">
            <div className="text-center mb-20 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-md mb-8">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm text-white/80" style={{ fontFamily: 'Inter, sans-serif' }}>AI CODE TRACKING PLATFORM</span>
              </div>

              <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <span className="block">Track AI Code</span>
                <span className="block bg-gradient-to-r from-white via-pink-200 to-fuchsia-200 bg-clip-text text-transparent">
                  In Your Repos
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
                Gain visibility into AI-generated code entering your codebase. Track team patterns, analyze commits, and understand your AI adoption.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <Button className="gap-3 bg-white text-purple-700 hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/10 px-8 py-6 text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 px-8 py-6 text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <span>View Demo</span>
                </Button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {[
                {
                  icon: GitBranch,
                  title: 'Multi-Repo',
                  description: 'Manage multiple repositories with unified analytics dashboard',
                  gradient: 'from-pink-500 to-rose-500',
                },
                {
                  icon: Brain,
                  title: 'AI Detection',
                  description: 'Advanced LLM-powered analysis of commits and branches',
                  gradient: 'from-violet-500 to-purple-500',
                },
                {
                  icon: BarChart3,
                  title: 'Analytics',
                  description: 'Deep insights with visual charts and developer statistics',
                  gradient: 'from-fuchsia-500 to-pink-500',
                },
                {
                  icon: Shield,
                  title: 'Admin Control',
                  description: 'Role-based access with manual AI flag overrides',
                  gradient: 'from-blue-500 to-violet-500',
                },
              ].map((feature, idx) => (
                <Card
                  key={idx}
                  className="group border-0 bg-white/10 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 animate-fade-in-up rounded-2xl"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient}`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-center font-bold mb-2 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {feature.title}
                    </h3>
                    <p className="text-center text-sm text-white/70" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Terminal-style CTA */}
            <div className="mt-20 max-w-2xl mx-auto">
              <Card className="border-0 bg-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
                <CardContent className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-2 text-white/50">terminal</span>
                  </div>
                  <div className="space-y-2 text-white/80">
                    <p>
                      <span className="text-white">$</span> npm install @donewithai/cli
                    </p>
                    <p>
                      <span className="text-white">$</span> donewithai track <span className="text-white/50">--repo="your-repo"</span>
                    </p>
                    <p className="text-white flex items-center gap-2">
                      <span className="inline-block w-2 h-4 bg-white animate-pulse" />
                      Tracking AI commits...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-white/20 bg-white/10 backdrop-blur-lg">
            <div className="container mx-auto px-6 py-6 text-center text-sm text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className="text-white/80">DoneWithAI</span> — AI Code Tracking Platform
            </div>
          </footer>
        </div>
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
          opacity: 0;
        }
      `}</style>
    </>
  );
}
