import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Workspace } from '@/types';

export interface CreateWorkspaceInput {
  name: string;
  type: Workspace['type'];
}

interface UseCreateWorkspaceOptions {
  setCurrentWorkspace?: (workspace: Workspace) => void;
}

export function useCreateWorkspace(options: UseCreateWorkspaceOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkspaceInput) => {
      const response = await apiRequest('POST', '/api/workspaces', data);
      return (await response.json()) as Workspace;
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      options.setCurrentWorkspace?.(workspace);
    },
  });
}
