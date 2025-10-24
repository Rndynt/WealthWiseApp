import { useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Workspace } from '@/types';

type CreateWorkspaceInput = {
  name: string;
  type: 'personal' | 'shared';
};

interface UseCreateWorkspaceOptions {
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export function useCreateWorkspace({ setCurrentWorkspace }: UseCreateWorkspaceOptions): UseMutationResult<Workspace, Error, CreateWorkspaceInput> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Workspace, Error, CreateWorkspaceInput>({
    mutationFn: async (data: CreateWorkspaceInput) => {
      const response = await apiRequest('POST', '/api/workspaces', data);
      return response.json() as Promise<Workspace>;
    },
    onSuccess: async (workspace) => {
      setCurrentWorkspace(workspace);
      await queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: 'Workspace created',
        description: 'Your new workspace has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat workspace',
        description: error.message || 'Terjadi kesalahan',
      });
    },
  });
}
