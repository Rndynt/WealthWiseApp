import type { Workspace } from '@shared/schema';

export interface WorkspaceOwnershipCounts {
  personalOwned: number;
  sharedOwned: number;
  personalMember: number;
  sharedMember: number;
}

export interface WorkspaceLimitBreakdown {
  personalOwned: number;
  personalMember: number;
  personalLimit: number | null;
  sharedOwned: number;
  sharedMember: number;
  sharedLimit: number | null;
  maxMembers: number | null;
}

export function calculateWorkspaceOwnershipCounts(
  userId: number,
  workspaces: ReadonlyArray<Pick<Workspace, 'type' | 'ownerId'>>
): WorkspaceOwnershipCounts {
  return workspaces.reduce<WorkspaceOwnershipCounts>((acc, workspace) => {
    const isOwner = workspace.ownerId === userId;

    if (workspace.type === 'personal') {
      if (isOwner) {
        acc.personalOwned += 1;
      } else {
        acc.personalMember += 1;
      }
    } else if (workspace.type === 'shared') {
      if (isOwner) {
        acc.sharedOwned += 1;
      } else {
        acc.sharedMember += 1;
      }
    }

    return acc;
  }, {
    personalOwned: 0,
    sharedOwned: 0,
    personalMember: 0,
    sharedMember: 0,
  });
}
