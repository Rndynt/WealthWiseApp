import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useCreateWorkspace } from './useCreateWorkspace';
import type { Workspace } from '@/types';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/queryClient')>('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from '@/lib/queryClient';

const mockedApiRequest = vi.mocked(apiRequest);

describe('useCreateWorkspace', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('activates the newly created workspace and invalidates the workspace list', async () => {
    const setCurrentWorkspace = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const mockWorkspace: Workspace = {
      id: 123,
      name: 'New Workspace',
      type: 'personal',
      ownerId: 1,
      createdAt: new Date().toISOString(),
    };

    mockedApiRequest.mockResolvedValueOnce(
      new Response(JSON.stringify(mockWorkspace), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateWorkspace({ setCurrentWorkspace }), { wrapper });

    await act(async () => {
      const workspace = await result.current.mutateAsync({
        name: mockWorkspace.name,
        type: mockWorkspace.type,
      });

      expect(workspace).toEqual(mockWorkspace);
    });

    expect(setCurrentWorkspace).toHaveBeenCalledWith(mockWorkspace);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['/api/workspaces'] });
  });
});
