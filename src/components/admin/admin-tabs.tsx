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
      {/* Terminal-style tab navigation */}
      <div className="flex items-center gap-1 mb-6 bg-slate-900/50 p-1 rounded-t-lg border border-green-900/30">
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
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="text-xs opacity-50">[{tab.shortcut}]</span>
            </button>
          );
        })}
      </div>

      {/* Active tab content with terminal frame */}
      <div className="bg-slate-900/30 border border-green-900/30 rounded-lg overflow-hidden">
        {/* Tab header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-green-900/30">
          <div className="flex items-center gap-2 text-sm font-mono text-green-500">
            <TabIcon className="h-4 w-4" />
            <span>/{tabs.find(t => t.id === activeTab)?.label.toLowerCase().replace(' ', '-')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
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
