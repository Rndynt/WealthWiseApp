import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';

// Hook untuk mengecek permission user
export function usePermissions() {
  const { user } = useAuth();
  
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<string[]>({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  const { data: userRole, isLoading: roleLoading } = useQuery<{ name: string } | null>({
    queryKey: ['/api/user/role'],
    enabled: !!user,
  });

  const hasPermission = (permission: string) => {
    if (permissionsLoading) return false;
    return Array.isArray(permissions) && permissions.includes(permission);
  };

  const hasRole = (roleName: string) => {
    if (roleLoading || !userRole) return false;
    return userRole.name === roleName;
  };

  const isRoot = () => hasRole('root');
  const isAdmin = () => hasRole('admin');  
  const isUser = () => hasRole('user');

  // Alias untuk konsistensi - untuk mengecek akses halaman
  const hasPageAccess = (resource: string) => {
    return hasPermission(`${resource}.view`) || hasPermission(`${resource}.access`);
  };

  return {
    permissions,
    userRole,
    hasPermission,
    hasRole,
    hasPageAccess,
    isRoot,
    isAdmin, 
    isUser,
    isLoading: permissionsLoading || roleLoading
  };
}

// Constants untuk permission names
export const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  
  // Permissions
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_READ: 'permissions.read',
  
  // Subscriptions
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_CREATE: 'subscriptions.create',
  SUBSCRIPTIONS_READ: 'subscriptions.read',
  SUBSCRIPTIONS_UPDATE: 'subscriptions.update',
  SUBSCRIPTIONS_DELETE: 'subscriptions.delete',
  
  // Workspace
  WORKSPACES_VIEW: 'workspaces.view',
  WORKSPACES_CREATE: 'workspaces.create',
  WORKSPACES_READ: 'workspaces.read',
  WORKSPACES_UPDATE: 'workspaces.update',
  WORKSPACES_DELETE: 'workspaces.delete',
  
  // Transactions
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_READ: 'transactions.read',
  TRANSACTIONS_UPDATE: 'transactions.update',
  TRANSACTIONS_DELETE: 'transactions.delete',
  
  // Budgets
  BUDGETS_VIEW: 'budgets.view',
  BUDGETS_CREATE: 'budgets.create',
  BUDGETS_READ: 'budgets.read',
  BUDGETS_UPDATE: 'budgets.update',
  BUDGETS_DELETE: 'budgets.delete',
  
  // Debts
  DEBTS_VIEW: 'debts.view',
  DEBTS_CREATE: 'debts.create',
  DEBTS_READ: 'debts.read',
  DEBTS_UPDATE: 'debts.update',
  DEBTS_DELETE: 'debts.delete',
  
  // Accounts
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_CREATE: 'accounts.create',
  ACCOUNTS_READ: 'accounts.read',
  ACCOUNTS_UPDATE: 'accounts.update',
  ACCOUNTS_DELETE: 'accounts.delete',
  
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_READ: 'reports.read',
  REPORTS_EXPORT: 'reports.export',
  
  // Collaboration
  COLLABORATION_VIEW: 'collaboration.view',
  COLLABORATION_MANAGE: 'collaboration.manage',

  // Settings (mapped to server permissions)
  SETTINGS_VIEW: 'settings.read',
  SETTINGS_MANAGE: 'settings.update',
  
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
} as const;

// Type for permission values
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];