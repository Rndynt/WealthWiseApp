import { describe, expect, it } from 'vitest';
import { calculateWorkspaceOwnershipCounts } from '../workspaceLimits';

describe('calculateWorkspaceOwnershipCounts', () => {
  it('separates owned and member workspaces by type', () => {
    const userId = 1;
    const workspaces = [
      { type: 'personal' as const, ownerId: 1 },
      { type: 'personal' as const, ownerId: 2 },
      { type: 'shared' as const, ownerId: 1 },
      { type: 'shared' as const, ownerId: 3 },
    ];

    const counts = calculateWorkspaceOwnershipCounts(userId, workspaces);

    expect(counts).toEqual({
      personalOwned: 1,
      personalMember: 1,
      sharedOwned: 1,
      sharedMember: 1,
    });
  });

  it('handles scenarios without memberships gracefully', () => {
    const userId = 42;
    const workspaces = [
      { type: 'personal' as const, ownerId: 42 },
      { type: 'personal' as const, ownerId: 42 },
      { type: 'shared' as const, ownerId: 99 },
    ];

    const counts = calculateWorkspaceOwnershipCounts(userId, workspaces);

    expect(counts).toEqual({
      personalOwned: 2,
      personalMember: 0,
      sharedOwned: 0,
      sharedMember: 1,
    });
  });
});
