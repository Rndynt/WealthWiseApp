import type { Workspace } from '@shared/schema';

export type WorkspaceWithMembership = Workspace & {
  membershipRole: string;
};

export interface WorkspaceLimitBreakdown {
  personalOwned: number;
  personalLimit: number | null;
  sharedOwned: number;
  sharedLimit: number | null;
}

function normalizeLimit(limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined) {
    return null;
  }

  // Treat negative values as unlimited (null) for safety
  return limit >= 0 ? limit : null;
}

export function deriveWorkspaceLimitBreakdown({
  userId,
  workspaces,
  personalLimit,
  sharedLimit,
}: {
  userId: number;
  workspaces: WorkspaceWithMembership[];
  personalLimit: number | null | undefined;
  sharedLimit: number | null | undefined;
}): WorkspaceLimitBreakdown {
  const normalizedPersonalLimit = normalizeLimit(personalLimit);
  const normalizedSharedLimit = normalizeLimit(sharedLimit);

  const ownedPersonal = workspaces.filter(
    (workspace) => workspace.ownerId === userId && workspace.type === 'personal'
  ).length;

  const ownedShared = workspaces.filter(
    (workspace) => workspace.ownerId === userId && workspace.type !== 'personal'
  ).length;

  return {
    personalOwned: ownedPersonal,
    personalLimit: normalizedPersonalLimit,
    sharedOwned: ownedShared,
    sharedLimit: normalizedSharedLimit,
  };
}
