'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, GitBranch, Brain, Key, Trophy } from 'lucide-react';
import ReposTab from '@/components/admin/repos-tab';
import MappingsTab from '@/components/admin/mappings-tab';
import AIFlagsTab from '@/components/admin/ai-flags-tab';
import KeywordsTab from '@/components/admin/keywords-tab';
import JobsTab from '@/components/admin/jobs-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags' | 'keywords' | 'jobs';

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('repos');

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={activeTab === 'repos' ? 'default' : 'outline'}
          onClick={() => setActiveTab('repos')}
        >
          <Database className="h-4 w-4 mr-2" />
          Repositories
        </Button>
        <Button
          variant={activeTab === 'mappings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('mappings')}
        >
          <GitBranch className="h-4 w-4 mr-2" />
          User Mapping
        </Button>
        <Button
          variant={activeTab === 'ai-flags' ? 'default' : 'outline'}
          onClick={() => setActiveTab('ai-flags')}
        >
          <Brain className="h-4 w-4 mr-2" />
          AI Flags
        </Button>
        <Button
          variant={activeTab === 'keywords' ? 'default' : 'outline'}
          onClick={() => setActiveTab('keywords')}
        >
          <Key className="h-4 w-4 mr-2" />
          Keywords
        </Button>
        <Button
          variant={activeTab === 'jobs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('jobs')}
        >
          <Trophy className="h-4 w-4 mr-2" />
          Jobs Report
        </Button>
      </div>

      {activeTab === 'repos' && <ReposTab />}
      {activeTab === 'mappings' && <MappingsTab />}
      {activeTab === 'ai-flags' && <AIFlagsTab />}
      {activeTab === 'keywords' && <KeywordsTab />}
      {activeTab === 'jobs' && <JobsTab />}
    </div>
  );
}
