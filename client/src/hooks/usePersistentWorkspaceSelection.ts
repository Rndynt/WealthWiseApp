import { useEffect, useMemo } from 'react';
import type { Workspace } from '@/types';

const buildStorageKey = (userId: number) => `workspace-preference:${userId}`;

interface Options {
  userId?: number;
  workspaces?: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace | null) => void;
}

export function usePersistentWorkspaceSelection({
  userId,
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
}: Options) {
  const storageKey = useMemo(() => {
    if (typeof userId !== 'number') {
      return null;
    }
    return buildStorageKey(userId);
  }, [userId]);

  const currentWorkspaceId = currentWorkspace?.id ?? null;

  useEffect(() => {
    if (!storageKey) {
      if (currentWorkspaceId !== null) {
        onWorkspaceChange(null);
      }
      return;
    }

    if (!workspaces) {
      return;
    }

    if (workspaces.length === 0) {
      localStorage.removeItem(storageKey);
      if (currentWorkspaceId !== null) {
        onWorkspaceChange(null);
      }
      return;
    }

    const storedId = localStorage.getItem(storageKey);
    const parsedStoredId = storedId ? Number(storedId) : NaN;

    const storedWorkspace =
      storedId && !Number.isNaN(parsedStoredId)
        ? workspaces.find((workspace) => workspace.id === parsedStoredId)
        : undefined;

    if (storedWorkspace) {
      if (currentWorkspaceId !== storedWorkspace.id) {
        onWorkspaceChange(storedWorkspace);
      }
      return;
    }

    if (storedId) {
      localStorage.removeItem(storageKey);
    }

    const fallbackWorkspace =
      workspaces.find((workspace) => workspace.type === 'personal') ?? workspaces[0];

    if (!fallbackWorkspace) {
      if (currentWorkspaceId !== null) {
        onWorkspaceChange(null);
      }
      return;
    }

    if (currentWorkspaceId !== fallbackWorkspace.id) {
      onWorkspaceChange(fallbackWorkspace);
    }

    localStorage.setItem(storageKey, String(fallbackWorkspace.id));
  }, [storageKey, workspaces, currentWorkspaceId, onWorkspaceChange]);

  useEffect(() => {
    if (!storageKey || currentWorkspaceId === null) {
      return;
    }

    localStorage.setItem(storageKey, String(currentWorkspaceId));
  }, [storageKey, currentWorkspaceId]);
}
