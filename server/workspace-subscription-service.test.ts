import { describe, it, expect } from 'vitest';
import { WorkspaceSubscriptionService } from './workspace-subscription-service';

describe('WorkspaceSubscriptionService', () => {
  it('allows invitation when below limit', async () => {
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => ({
        subscription: { id: 1, status: 'active', endDate: new Date(Date.now() + 60_000) } as any,
        package: { maxMembers: 5 } as any,
      }),
    } as any);

    const result = await service.validateMemberLimit(1, 3);

    expect(result.canAdd).toBe(true);
    expect(result.maxMembers).toBe(5);
    expect(result.currentMembers).toBe(3);
  });

  it('blocks invitation when limit reached', async () => {
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => ({
        subscription: { id: 1, status: 'active', endDate: new Date(Date.now() + 60_000) } as any,
        package: { maxMembers: 3 } as any,
      }),
    } as any);

    const result = await service.validateMemberLimit(1, 3);

    expect(result.canAdd).toBe(false);
    expect(result.maxMembers).toBe(3);
    expect(result.reason).toBe('Batas anggota workspace (3) telah tercapai.');
  });

  it('blocks invitation when subscription expired', async () => {
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => ({
        subscription: { id: 1, status: 'expired', endDate: new Date(Date.now() - 60_000) } as any,
        package: { maxMembers: 5 } as any,
      }),
    } as any);

    const result = await service.validateMemberLimit(1, 2);

    expect(result.canAdd).toBe(false);
    expect(result.maxMembers).toBe(0);
    expect(result.reason).toBe('Langganan workspace sudah tidak aktif. Perbarui langganan akun untuk melanjutkan kolaborasi.');
  });

  it('blocks invitation when no subscription found', async () => {
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => undefined,
    } as any);

    const result = await service.validateMemberLimit(1, 2);

    expect(result.canAdd).toBe(false);
    expect(result.maxMembers).toBe(0);
    expect(result.reason).toBe('Workspace ini tidak memiliki langganan kolaborasi aktif.');
  });
});
