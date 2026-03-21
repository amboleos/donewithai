'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface AIKeyword {
  id: number;
  keyword: string;
  is_active: number;
  created_at: string;
}

export default function KeywordsTab() {
  const [keywords, setKeywords] = useState<AIKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keywords');
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      toast.error('Failed to load keywords');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add keyword');
      }

      await fetchKeywords();
      setNewKeyword('');
      toast.success('Keyword added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add keyword');
    }
  };

  const deleteKeyword = async (id: number) => {
    try {
      await fetch(`/api/admin/keywords?id=${id}`, { method: 'DELETE' });
      await fetchKeywords();
      toast.success('Keyword deleted');
    } catch (error) {
      toast.error('Failed to delete keyword');
    }
  };

  const toggleKeyword = async (id: number, isActive: boolean) => {
    try {
      await fetch('/api/admin/keywords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      await fetchKeywords();
      toast.success('Keyword updated');
    } catch (error) {
      toast.error('Failed to update keyword');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Keywords</CardTitle>
        <p className="text-sm text-slate-500">
          Commits containing these keywords will be auto-flagged as AI-generated
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add new keyword (e.g., 'copilot', 'gpt')"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            className="max-w-sm"
          />
          <Button onClick={addKeyword}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {keywords.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No keywords configured</p>
          ) : (
            keywords.map((kw) => (
              <div
                key={kw.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{kw.keyword}</span>
                  {kw.is_active ? (
                    <Badge variant="default" className="bg-green-100 text-green-700">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleKeyword(kw.id, !kw.is_active)}
                  >
                    {kw.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKeyword(kw.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
