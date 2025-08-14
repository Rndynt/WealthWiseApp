import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './auth';

// ENHANCED PERMISSIONS with admin/user separation and .pages/.access granularity
export const ENHANCED_PERMISSIONS = {
  // ROOT BYPASS
  ROOT_BYPASS: 'root.bypass',
  
  // ADMIN PERMISSIONS (admin.* prefix)
  ADMIN_USERS_PAGES: 'admin.users.pages',
  ADMIN_USERS_ACCESS: 'admin.users.access',
  ADMIN_USERS_CREATE: 'admin.users.create',
  ADMIN_USERS_READ: 'admin.users.read',
  ADMIN_USERS_UPDATE: 'admin.users.update',
  ADMIN_USERS_DELETE: 'admin.users.delete',
  
  ADMIN_ROLES_PAGES: 'admin.roles.pages',
  ADMIN_ROLES_ACCESS: 'admin.roles.access',
  ADMIN_ROLES_CREATE: 'admin.roles.create',
  ADMIN_ROLES_READ: 'admin.roles.read',
  ADMIN_ROLES_UPDATE: 'admin.roles.update',
  ADMIN_ROLES_DELETE: 'admin.roles.delete',
  
  ADMIN_PERMISSIONS_PAGES: 'admin.permissions.pages',
  ADMIN_PERMISSIONS_ACCESS: 'admin.permissions.access',
  ADMIN_PERMISSIONS_READ: 'admin.permissions.read',
  
  ADMIN_SUBSCRIPTIONS_PAGES: 'admin.subscriptions.pages',
  ADMIN_SUBSCRIPTIONS_ACCESS: 'admin.subscriptions.access',
  ADMIN_SUBSCRIPTIONS_MANAGE: 'admin.subscriptions.manage',
  
  ADMIN_SETTINGS_PAGES: 'admin.settings.pages',
  ADMIN_SETTINGS_ACCESS: 'admin.settings.access',
  ADMIN_SETTINGS_UPDATE: 'admin.settings.update',
  
  // USER PERMISSIONS (user.* prefix)
  USER_DASHBOARD_PAGES: 'user.dashboard.pages',
  USER_DASHBOARD_ACCESS: 'user.dashboard.access',
  
  USER_ACCOUNTS_PAGES: 'user.accounts.pages',
  USER_ACCOUNTS_ACCESS: 'user.accounts.access',
  USER_ACCOUNTS_CREATE: 'user.accounts.create',
  USER_ACCOUNTS_READ: 'user.accounts.read',
  USER_ACCOUNTS_UPDATE: 'user.accounts.update',
  USER_ACCOUNTS_DELETE: 'user.accounts.delete',
  
  USER_TRANSACTIONS_PAGES: 'user.transactions.pages',
  USER_TRANSACTIONS_ACCESS: 'user.transactions.access',
  USER_TRANSACTIONS_CREATE: 'user.transactions.create',
  USER_TRANSACTIONS_READ: 'user.transactions.read',
  USER_TRANSACTIONS_UPDATE: 'user.transactions.update',
  USER_TRANSACTIONS_DELETE: 'user.transactions.delete',
  
  USER_CATEGORIES_PAGES: 'user.categories.pages',
  USER_CATEGORIES_ACCESS: 'user.categories.access',
  USER_CATEGORIES_CREATE: 'user.categories.create',
  USER_CATEGORIES_READ: 'user.categories.read',
  USER_CATEGORIES_UPDATE: 'user.categories.update',
  USER_CATEGORIES_DELETE: 'user.categories.delete',
  
  USER_BUDGETS_PAGES: 'user.budgets.pages',
  USER_BUDGETS_ACCESS: 'user.budgets.access',
  USER_BUDGETS_CREATE: 'user.budgets.create',
  USER_BUDGETS_READ: 'user.budgets.read',
  USER_BUDGETS_UPDATE: 'user.budgets.update',
  USER_BUDGETS_DELETE: 'user.budgets.delete',
  
  USER_REPORTS_PAGES: 'user.reports.pages',
  USER_REPORTS_ACCESS: 'user.reports.access',
  USER_REPORTS_READ: 'user.reports.read',
  USER_REPORTS_EXPORT: 'user.reports.export',
  
  USER_DEBTS_PAGES: 'user.debts.pages',
  USER_DEBTS_ACCESS: 'user.debts.access',
  USER_DEBTS_CREATE: 'user.debts.create',
  USER_DEBTS_READ: 'user.debts.read',
  USER_DEBTS_UPDATE: 'user.debts.update',
  USER_DEBTS_DELETE: 'user.debts.delete',
  
  USER_COLLABORATION_PAGES: 'user.collaboration.pages',
  USER_COLLABORATION_ACCESS: 'user.collaboration.access',
  USER_COLLABORATION_INVITE: 'user.collaboration.invite',
  USER_COLLABORATION_MANAGE: 'user.collaboration.manage',
  
  USER_WORKSPACES_PAGES: 'user.workspaces.pages',
  USER_WORKSPACES_ACCESS: 'user.workspaces.access',
  USER_WORKSPACES_CREATE: 'user.workspaces.create',
  USER_WORKSPACES_READ: 'user.workspaces.read',
  USER_WORKSPACES_UPDATE: 'user.workspaces.update',
  USER_WORKSPACES_DELETE: 'user.workspaces.delete',
  
  USER_PROFILE_PAGES: 'user.profile.pages',
  USER_PROFILE_ACCESS: 'user.profile.access',
  USER_PROFILE_UPDATE: 'user.profile.update',
  
  USER_SUBSCRIPTION_PAGES: 'user.subscription.pages',
  USER_SUBSCRIPTION_ACCESS: 'user.subscription.access',
  USER_SUBSCRIPTION_UPGRADE: 'user.subscription.upgrade',
} as const;

type EnhancedPermission = typeof ENHANCED_PERMISSIONS[keyof typeof ENHANCED_PERMISSIONS];

interface UserWithRole {
  id: number;
  email: string;
  name: string;
  roleId: number;
  role?: {
    id: number;
    name: string;
    permissions: string[];
  };
}

interface EnhancedPermissionsContextType {
  hasPermission: (permission: EnhancedPermission) => boolean;
  hasPageAccess: (basePermission: string) => boolean; // Check .pages permission
  hasFeatureAccess: (basePermission: string) => boolean; // Check .access permission  
  isRoot: boolean;
  isAdmin: boolean;
  isUserBasic: boolean;
  isUserPremium: boolean;
  isLoading: boolean;
  userRole: string | null;
}

const EnhancedPermissionsContext = createContext<EnhancedPermissionsContextType | undefined>(undefined);

export function EnhancedPermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userWithRole = user as UserWithRole | null;

  const hasPermission = (permission: EnhancedPermission): boolean => {
    if (loading || !userWithRole) return false;
    
    // Root user has bypass - all permissions granted
    if (userWithRole.role?.name === 'root' || userWithRole.email === 'root@financeflow.com') {
      return true;
    }
    
    // Check specific permissions
    return userWithRole.role?.permissions?.includes(permission) || false;
  };

  const hasPageAccess = (basePermission: string): boolean => {
    // Check if user has .pages permission for menu visibility
    const pagePermission = `${basePermission}.pages`;
    return hasPermission(pagePermission as EnhancedPermission);
  };

  const hasFeatureAccess = (basePermission: string): boolean => {
    // Check if user has .access permission for actual feature access
    const accessPermission = `${basePermission}.access`;
    return hasPermission(accessPermission as EnhancedPermission);
  };

  // Role checks
  const isRoot = userWithRole?.role?.name === 'root' || userWithRole?.email === 'root@financeflow.com' || false;
  const isAdmin = userWithRole?.role?.name === 'admin' || false;
  const isUserBasic = userWithRole?.role?.name === 'user_basic' || false;
  const isUserPremium = userWithRole?.role?.name === 'user_premium' || false;

  const userRole = userWithRole?.role?.name || null;

  return (
    <EnhancedPermissionsContext.Provider 
      value={{ 
        hasPermission,
        hasPageAccess,
        hasFeatureAccess,
        isRoot,
        isAdmin: isAdmin || isRoot, 
        isUserBasic,
        isUserPremium,
        isLoading: loading,
        userRole
      }}
    >
      {children}
    </EnhancedPermissionsContext.Provider>
  );
}

export function useEnhancedPermissions() {
  const context = useContext(EnhancedPermissionsContext);
  if (context === undefined) {
    throw new Error('useEnhancedPermissions must be used within an EnhancedPermissionsProvider');
  }
  return context;
}

// Navigation items with enhanced permission structure
export const ENHANCED_NAVIGATION_ITEMS = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    pagePermission: ENHANCED_PERMISSIONS.USER_DASHBOARD_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_DASHBOARD_ACCESS
  },
  { 
    path: '/accounts', 
    label: 'Accounts',
    pagePermission: ENHANCED_PERMISSIONS.USER_ACCOUNTS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_ACCOUNTS_ACCESS
  },
  { 
    path: '/transactions', 
    label: 'Transactions',
    pagePermission: ENHANCED_PERMISSIONS.USER_TRANSACTIONS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_TRANSACTIONS_ACCESS
  },
  { 
    path: '/categories', 
    label: 'Categories',
    pagePermission: ENHANCED_PERMISSIONS.USER_CATEGORIES_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_CATEGORIES_ACCESS
  },
  { 
    path: '/budget', 
    label: 'Budget',
    pagePermission: ENHANCED_PERMISSIONS.USER_BUDGETS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_BUDGETS_ACCESS
  },
  { 
    path: '/reports', 
    label: 'Reports',
    pagePermission: ENHANCED_PERMISSIONS.USER_REPORTS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_REPORTS_ACCESS
  },
  { 
    path: '/debts', 
    label: 'Debts',
    pagePermission: ENHANCED_PERMISSIONS.USER_DEBTS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_DEBTS_ACCESS
  },
  { 
    path: '/collaboration', 
    label: 'Collaboration',
    pagePermission: ENHANCED_PERMISSIONS.USER_COLLABORATION_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.USER_COLLABORATION_ACCESS
  },
];

export const ENHANCED_ADMIN_NAVIGATION_ITEMS = [
  { 
    path: '/users', 
    label: 'User Management',
    pagePermission: ENHANCED_PERMISSIONS.ADMIN_USERS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.ADMIN_USERS_ACCESS
  },
  { 
    path: '/roles', 
    label: 'Role Management',
    pagePermission: ENHANCED_PERMISSIONS.ADMIN_ROLES_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.ADMIN_ROLES_ACCESS
  },
  { 
    path: '/subscription-packages', 
    label: 'Subscription Packages',
    pagePermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_ACCESS
  },
  { 
    path: '/user-subscriptions', 
    label: 'User Subscriptions',
    pagePermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_ACCESS
  },
  { 
    path: '/settings', 
    label: 'App Settings',
    pagePermission: ENHANCED_PERMISSIONS.ADMIN_SETTINGS_PAGES,
    accessPermission: ENHANCED_PERMISSIONS.ADMIN_SETTINGS_ACCESS
  },
];