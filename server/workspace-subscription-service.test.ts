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
        package: { maxMembers: 5, canCreateSharedWorkspace: true } as any,
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

  it('blocks invitation when package no longer supports shared workspace', async () => {
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => ({
        subscription: {
          id: 1,
          status: 'readonly',
          endDate: new Date(Date.now() + 60_000),
          gracePeriodEnd: null,
        } as any,
        package: { maxMembers: 5, canCreateSharedWorkspace: false } as any,
      }),
    } as any);

    const result = await service.validateMemberLimit(1, 1);

    expect(result.canAdd).toBe(false);
    expect(result.reason).toBe('Paket langganan saat ini tidak mendukung shared workspace. Upgrade diperlukan untuk melanjutkan kolaborasi.');
  });

  it('blocks invitation when subscription is in grace period', async () => {
    const graceEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const service = new WorkspaceSubscriptionService({
      getWorkspaceSubscriptionWithPackage: async () => ({
        subscription: {
          id: 1,
          status: 'readonly',
          endDate: new Date(Date.now() - 60_000),
          gracePeriodEnd: graceEnd,
        } as any,
        package: { maxMembers: 5, canCreateSharedWorkspace: true } as any,
      }),
    } as any);

    const result = await service.validateMemberLimit(1, 1);

    expect(result.canAdd).toBe(false);
    expect(result.reason).toBe('Langganan workspace berada dalam masa tenggang. Perpanjang langganan akun sebelum masa tenggang berakhir.');
  });
});
