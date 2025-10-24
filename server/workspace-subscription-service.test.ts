import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceSubscriptionService } from './workspace-subscription-service';

test('validateMemberLimit allows invitation when below limit', async () => {
  const service = new WorkspaceSubscriptionService({
    getWorkspaceSubscriptionWithPackage: async () => ({
      subscription: { id: 1 } as any,
      package: { maxMembers: 5 } as any,
    }),
  } as any);

  const result = await service.validateMemberLimit(1, 3);

  assert.equal(result.canAdd, true);
  assert.equal(result.maxMembers, 5);
  assert.equal(result.currentMembers, 3);
});

test('validateMemberLimit blocks invitation when limit reached', async () => {
  const service = new WorkspaceSubscriptionService({
    getWorkspaceSubscriptionWithPackage: async () => ({
      subscription: { id: 1 } as any,
      package: { maxMembers: 3 } as any,
    }),
  } as any);

  const result = await service.validateMemberLimit(1, 3);

  assert.equal(result.canAdd, false);
  assert.equal(result.maxMembers, 3);
  assert.equal(result.reason, 'Batas anggota workspace (3) telah tercapai.');
});

test('validateMemberLimit blocks invitation when no subscription found', async () => {
  const service = new WorkspaceSubscriptionService({
    getWorkspaceSubscriptionWithPackage: async () => undefined,
  } as any);

  const result = await service.validateMemberLimit(1, 2);

  assert.equal(result.canAdd, false);
  assert.equal(result.maxMembers, 0);
  assert.equal(result.reason, 'Workspace ini tidak memiliki langganan kolaborasi aktif.');
});
