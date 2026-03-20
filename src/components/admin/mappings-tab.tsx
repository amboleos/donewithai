'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, UserPlus, Trash2, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

interface Repo {
  id: number;
  name: string;
}

interface PublicUser {
  id: number;
  name: string;
  email: string;
  github_username: string | null;
  role: string;
}

interface UserMapping {
  id: number;
  repo_id: number;
  github_username: string;
  user_id: number;
  name: string;
  email: string;
}

export default function MappingsTab() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [unmappedUsers, setUnmappedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMapping, setAddingMapping] = useState(false);
  const [newGithubUsername, setNewGithubUsername] = useState('');
  const [newUserId, setNewUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch repos
      const reposRes = await fetch('/api/repos');
      const reposData = await reposRes.json();
      setRepos(reposData.repos || []);

      // Fetch users
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchMappings(selectedRepo);
    }
  }, [selectedRepo]);

  const fetchMappings = async (repoId: number) => {
    try {
      const res = await fetch(`/api/admin/github-users/${repoId}`);
      const data = await res.json();
      setMappings(data.mapped || []);
      setUnmappedUsers(data.unmapped || []);
    } catch (error) {
      toast.error('Failed to fetch mappings');
    }
  };

  const handleAddMapping = async () => {
    if (!selectedRepo || !newGithubUsername || !newUserId) {
      toast.error('Please fill in all fields');
      return;
    }

    setAddingMapping(true);
    try {
      const res = await fetch('/api/admin/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: selectedRepo,
          githubUsername: newGithubUsername,
          userId: newUserId,
        }),
      });

      if (!res.ok) throw new Error('Failed to add mapping');

      toast.success('Mapping added');
      setNewGithubUsername('');
      setNewUserId(null);
      fetchMappings(selectedRepo);
    } catch (error) {
      toast.error('Failed to add mapping');
    } finally {
      setAddingMapping(false);
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    try {
      await fetch(`/api/admin/mappings/${mappingId}`, { method: 'DELETE' });
      toast.success('Mapping deleted');
      if (selectedRepo) {
        fetchMappings(selectedRepo);
      }
    } catch (error) {
      toast.error('Failed to delete mapping');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Repository</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {repos.length === 0 ? (
              <p className="text-slate-500">No repositories available</p>
            ) : (
              repos.map((repo) => (
                <Button
                  key={repo.id}
                  variant={selectedRepo === repo.id ? 'default' : 'outline'}
                  onClick={() => setSelectedRepo(repo.id)}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  {repo.name}
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedRepo && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add New Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">
                    GitHub Username (from commits)
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={newGithubUsername}
                    onChange={(e) => setNewGithubUsername(e.target.value)}
                  >
                    <option value="">Select GitHub user</option>
                    {unmappedUsers.map((username) => (
                      <option key={username} value={username}>
                        {username}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">
                    Map to User
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={newUserId || ''}
                    onChange={(e) => setNewUserId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleAddMapping}
                  disabled={addingMapping || !newGithubUsername || !newUserId}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {addingMapping ? 'Adding...' : 'Add Mapping'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No mappings yet</p>
              ) : (
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{mapping.github_username}</Badge>
                        <span className="text-slate-500">→</span>
                        <div>
                          <p className="font-medium">{mapping.name}</p>
                          <p className="text-sm text-slate-500">{mapping.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
