import type { DatabaseStorage } from './storage';
import type { SubscriptionPackage, WorkspaceSubscription } from '@shared/schema';

export type WorkspaceSubscriptionWithPackage = {
  subscription: WorkspaceSubscription;
  package: SubscriptionPackage;
};

export interface MemberLimitValidationResult {
  canAdd: boolean;
  maxMembers: number | null;
  currentMembers: number;
  subscription?: WorkspaceSubscriptionWithPackage;
  reason?: string;
}

export class WorkspaceSubscriptionService {
  constructor(
    private readonly storage: Pick<DatabaseStorage, 'getWorkspaceSubscriptionWithPackage'>,
  ) {}

  async getSubscriptionWithPackage(workspaceId: string): Promise<WorkspaceSubscriptionWithPackage | undefined> {
    return this.storage.getWorkspaceSubscriptionWithPackage(workspaceId);
  }

  async validateMemberLimit(workspaceId: string, currentMembers: number): Promise<MemberLimitValidationResult> {
    const subscriptionData = await this.getSubscriptionWithPackage(workspaceId);

    if (!subscriptionData) {
      return {
        canAdd: false,
        maxMembers: 0,
        currentMembers,
        reason: 'Workspace ini tidak memiliki langganan kolaborasi aktif.',
      };
    }

    const { subscription, package: packageData } = subscriptionData;
    const now = new Date();
    const subscriptionEnd = new Date(subscription.endDate);
    const gracePeriodEnd = subscription.gracePeriodEnd ? new Date(subscription.gracePeriodEnd) : null;
    const packageSupportsShared = packageData.canCreateSharedWorkspace ?? false;
    const isActive = subscription.status === 'active' && subscriptionEnd > now;
    const isInGraceWindow = gracePeriodEnd ? gracePeriodEnd > now : false;

    if (!isActive) {
      let reason = 'Langganan workspace sudah tidak aktif. Perbarui langganan akun untuk melanjutkan kolaborasi.';

      if (subscription.status === 'readonly') {
        if (!packageSupportsShared) {
          reason = 'Paket langganan saat ini tidak mendukung shared workspace. Upgrade diperlukan untuk melanjutkan kolaborasi.';
        } else if (isInGraceWindow) {
          reason = 'Langganan workspace berada dalam masa tenggang. Perpanjang langganan akun sebelum masa tenggang berakhir.';
        }
      }

      return {
        canAdd: false,
        maxMembers: 0,
        currentMembers,
        subscription: subscriptionData,
        reason,
      };
    }

    const maxMembers = packageData.maxMembers;

    if (maxMembers !== null && typeof maxMembers === 'number' && currentMembers >= maxMembers) {
      return {
        canAdd: false,
        maxMembers,
        currentMembers,
        subscription: subscriptionData,
        reason: `Batas anggota workspace (${maxMembers}) telah tercapai.`,
      };
    }

    return {
      canAdd: true,
      maxMembers,
      currentMembers,
      subscription: subscriptionData,
    };
  }
}
