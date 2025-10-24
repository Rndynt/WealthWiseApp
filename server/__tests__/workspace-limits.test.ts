import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { deriveWorkspaceLimitBreakdown, type WorkspaceWithMembership } from '../utils/workspaceLimits.ts';

describe('deriveWorkspaceLimitBreakdown', () => {
  const baseWorkspace = {
    name: 'Workspace',
    createdAt: new Date().toISOString(),
  } as const;

  it('counts owned personal and shared workspaces separately', () => {
    const workspaces: WorkspaceWithMembership[] = [
      { ...baseWorkspace, id: 1, type: 'personal', ownerId: 1, membershipRole: 'owner' },
      { ...baseWorkspace, id: 2, type: 'personal', ownerId: 1, membershipRole: 'owner' },
      { ...baseWorkspace, id: 3, type: 'family', ownerId: 1, membershipRole: 'owner' },
      { ...baseWorkspace, id: 4, type: 'business', ownerId: 2, membershipRole: 'editor' },
    ];

    const breakdown = deriveWorkspaceLimitBreakdown({
      userId: 1,
      workspaces,
      personalLimit: 3,
      sharedLimit: 2,
    });

    assert.equal(breakdown.personalOwned, 2);
    assert.equal(breakdown.sharedOwned, 1);
    assert.equal(breakdown.personalLimit, 3);
    assert.equal(breakdown.sharedLimit, 2);
  });

  it('treats negative limits as unlimited (null)', () => {
    const workspaces: WorkspaceWithMembership[] = [
      { ...baseWorkspace, id: 1, type: 'personal', ownerId: 1, membershipRole: 'owner' },
    ];

    const breakdown = deriveWorkspaceLimitBreakdown({
      userId: 1,
      workspaces,
      personalLimit: -1,
      sharedLimit: -5,
    });

    assert.equal(breakdown.personalOwned, 1);
    assert.equal(breakdown.sharedOwned, 0);
    assert.equal(breakdown.personalLimit, null);
    assert.equal(breakdown.sharedLimit, null);
  });
});
