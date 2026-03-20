'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, GitBranch, Brain } from 'lucide-react';
import ReposTab from '@/components/admin/repos-tab';
import MappingsTab from '@/components/admin/mappings-tab';
import AIFlagsTab from '@/components/admin/ai-flags-tab';

type TabType = 'repos' | 'mappings' | 'ai-flags';

export default function AdminTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('repos');

  return (
    <div>
      <div className="flex gap-2 mb-6">
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
      </div>

      {activeTab === 'repos' && <ReposTab />}
      {activeTab === 'mappings' && <MappingsTab />}
      {activeTab === 'ai-flags' && <AIFlagsTab />}
    </div>
  );
}
