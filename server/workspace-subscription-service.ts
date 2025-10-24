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

  async getSubscriptionWithPackage(workspaceId: number): Promise<WorkspaceSubscriptionWithPackage | undefined> {
    return this.storage.getWorkspaceSubscriptionWithPackage(workspaceId);
  }

  async validateMemberLimit(workspaceId: number, currentMembers: number): Promise<MemberLimitValidationResult> {
    const subscriptionData = await this.getSubscriptionWithPackage(workspaceId);

    if (!subscriptionData) {
      return {
        canAdd: false,
        maxMembers: 0,
        currentMembers,
        reason: 'Workspace ini tidak memiliki langganan kolaborasi aktif.',
      };
    }

    const { package: packageData } = subscriptionData;
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
