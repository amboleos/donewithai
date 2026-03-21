import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, GitBranch, BarChart3, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold">DoneWithAI</span>
          </div>
          <Link href="/login">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Track AI Code in Your Repos
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Gain visibility into AI-generated code entering your codebase. Track team patterns,
            analyze commits, and understand your AI adoption.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <GitBranch className="h-10 w-10 text-indigo-600 mb-2" />
              <CardTitle>Multi-Repo Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add and remove repositories, view per-repo analytics and commit history
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>AI Detection</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Analyze commit messages and branches using AI to detect AI-generated code
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-emerald-600 mb-2" />
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Weekly/monthly reports with charts showing lines added/removed and AI patterns
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-amber-600 mb-2" />
              <CardTitle>Super Admin Control</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manually toggle AI flags and manage team access with role-based permissions
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
