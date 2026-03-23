'use client';

import { useState } from 'react';
import { Database, GitBranch, Brain, Key, Trophy } from 'lucide-react';
import ReposTab from '@/components/admin/repos-tab';
import MappingsTab from '@/components/admin/mappings-tab';
import AIFlagsTab from '@/components/admin/ai-flags-tab';
import KeywordsTab from '@/components/admin/keywords-tab';
import JobsTab from '@/components/admin/jobs-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags' | 'keywords' | 'jobs';

interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof Database;
  shortcut: string;
}

const tabs: TabConfig[] = [
  { id: 'repos', label: 'Repositories', icon: Database, shortcut: '1' },
  { id: 'mappings', label: 'User Mapping', icon: GitBranch, shortcut: '2' },
  { id: 'ai-flags', label: 'AI Flags', icon: Brain, shortcut: '3' },
  { id: 'keywords', label: 'Keywords', icon: Key, shortcut: '4' },
  { id: 'jobs', label: 'Jobs Report', icon: Trophy, shortcut: '5' },
];

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('repos');

  const TabIcon = tabs.find(t => t.id === activeTab)?.icon || Database;

  return (
    <div>
      {/* Neo-Brutalist tab navigation */}
      <div className="flex items-center gap-1 mb-6 bg-[var(--muted)] p-1 rounded-t-lg border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded font-mono text-sm transition-all duration-150
                ${isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-sm)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] border-2 border-transparent'
                }
              `}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <Icon className="h-4 w-4" />
              <span style={{ fontFamily: 'Sora, sans-serif' }}>{tab.label}</span>
              <span className="text-xs opacity-50">[{tab.shortcut}]</span>
            </button>
          );
        })}
      </div>

      {/* Active tab content with Neo-Brutalist frame */}
      <div className="bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal)] rounded-lg overflow-hidden">
        {/* Tab header bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--muted)] border-b-2 border-[var(--border)]">
          <div className="flex items-center gap-2 text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <TabIcon className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-[var(--foreground)]">/{tabs.find(t => t.id === activeTab)?.label.toLowerCase().replace(' ', '-')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[var(--destructive)] bg-[var(--destructive)]" />
            <div className="w-3 h-3 border-2 border-[var(--warning)] bg-[var(--warning)]" />
            <div className="w-3 h-3 border-2 border-[var(--success)] bg-[var(--success)]" />
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'repos' && <ReposTab />}
          {activeTab === 'mappings' && <MappingsTab />}
          {activeTab === 'ai-flags' && <AIFlagsTab />}
          {activeTab === 'keywords' && <KeywordsTab />}
          {activeTab === 'jobs' && <JobsTab />}
        </div>
      </div>
    </div>
  );
}
