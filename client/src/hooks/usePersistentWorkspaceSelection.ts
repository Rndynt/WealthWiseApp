import { useEffect, useMemo } from 'react';
import type { Workspace } from '@/types';

const PREFERENCE_PREFIX = 'workspacePreference';

function getPreferenceKey(userId?: number | null) {
  if (!userId) {
    return null;
  }
  return `${PREFERENCE_PREFIX}:${userId}`;
}

interface Options {
  userId?: number | null;
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
  const preferenceKey = useMemo(() => getPreferenceKey(userId), [userId]);

  useEffect(() => {
    if (!preferenceKey) {
      return;
    }

    if (currentWorkspace?.id) {
      localStorage.setItem(preferenceKey, currentWorkspace.id.toString());
    } else {
      localStorage.removeItem(preferenceKey);
    }
  }, [preferenceKey, currentWorkspace?.id]);

  useEffect(() => {
    if (!workspaces) {
      return;
    }

    if (!workspaces.length) {
      if (currentWorkspace) {
        onWorkspaceChange(null);
      }
      if (preferenceKey) {
        localStorage.removeItem(preferenceKey);
      }
      return;
    }

    const matchingWorkspace = currentWorkspace
      ? workspaces.find((workspace) => workspace.id === currentWorkspace.id)
      : undefined;

    if (matchingWorkspace) {
      if (matchingWorkspace !== currentWorkspace) {
        onWorkspaceChange(matchingWorkspace);
      }
      return;
    }

    let preferredWorkspace: Workspace | undefined;

    if (preferenceKey) {
      const storedWorkspaceId = localStorage.getItem(preferenceKey);
      if (storedWorkspaceId) {
        preferredWorkspace = workspaces.find(
          (workspace) => workspace.id.toString() === storedWorkspaceId,
        );

        if (!preferredWorkspace) {
          localStorage.removeItem(preferenceKey);
        }
      }
    }

    const nextWorkspace = preferredWorkspace
      || workspaces.find((workspace) => workspace.type === 'personal')
      || workspaces[0];

    onWorkspaceChange(nextWorkspace ?? null);
  }, [workspaces, currentWorkspace, onWorkspaceChange, preferenceKey]);

  useEffect(() => {
    if (userId) {
      return;
    }

    if (currentWorkspace) {
      onWorkspaceChange(null);
    }
  }, [userId, currentWorkspace, onWorkspaceChange]);
}
