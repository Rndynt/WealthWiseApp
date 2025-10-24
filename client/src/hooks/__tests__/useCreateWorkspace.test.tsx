import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Workspace } from '@/types';
import { useCreateWorkspace } from '../useCreateWorkspace';

const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

describe('useCreateWorkspace', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    toastSpy.mockClear();
    (globalThis as any).fetch = fetchMock;
    localStorage.clear();
  });

  it('sets current workspace on success and invalidates workspace list', async () => {
    const workspace: Workspace = {
      id: 1,
      name: 'Test Workspace',
      type: 'personal',
      ownerId: 1,
      createdAt: new Date().toISOString(),
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(workspace),
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setCurrentWorkspace = vi.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useCreateWorkspace({ setCurrentWorkspace }),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ name: 'Test Workspace', type: 'personal' });
    });

    expect(setCurrentWorkspace).toHaveBeenCalledWith(workspace);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['/api/workspaces'] });
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces', expect.objectContaining({ method: 'POST' }));
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Workspace created' }));
  });
});
