export interface WorkspaceQuotaSection {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface WorkspaceQuotaBreakdown {
  personal: WorkspaceQuotaSection;
  shared: WorkspaceQuotaSection;
  sharedInvitations: {
    used: number;
  };
}

export interface WorkspaceSubscriptionLimits {
  maxWorkspaces: number | null;
  maxMembers: number;
  maxSharedWorkspaces: number | null;
  canCreateSharedWorkspace: boolean;
  currentWorkspaces: number;
  breakdown: WorkspaceQuotaBreakdown;
}
