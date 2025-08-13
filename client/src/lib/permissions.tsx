import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './auth';

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Accounts
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_CREATE: 'accounts.create',
  ACCOUNTS_EDIT: 'accounts.edit',
  ACCOUNTS_DELETE: 'accounts.delete',
  
  // Transactions
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_EDIT: 'transactions.edit',
  TRANSACTIONS_DELETE: 'transactions.delete',
  
  // Categories
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_EDIT: 'categories.edit',
  CATEGORIES_DELETE: 'categories.delete',
  
  // Budgets
  BUDGETS_VIEW: 'budgets.view',
  BUDGETS_CREATE: 'budgets.create',
  BUDGETS_EDIT: 'budgets.edit',
  BUDGETS_DELETE: 'budgets.delete',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  
  // Debts
  DEBTS_VIEW: 'debts.view',
  DEBTS_CREATE: 'debts.create',
  DEBTS_EDIT: 'debts.edit',
  DEBTS_DELETE: 'debts.delete',
  
  // Collaboration
  COLLABORATION_VIEW: 'collaboration.view',
  COLLABORATION_MANAGE: 'collaboration.manage',
  
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  
  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  
  // Subscriptions
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  
  // Settings (align with server)
  SETTINGS_VIEW: 'settings.read',
  SETTINGS_MANAGE: 'settings.update',
} as const;

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

interface UserWithRole {
  id: number;
  email: string;
  name: string;
  role?: {
    name: string;
    permissions: string[];
  };
}

interface PermissionsContextType {
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isRoot: boolean;
  isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userWithRole = user as UserWithRole | null;

  const hasPermission = (permission: Permission): boolean => {
    if (loading || !userWithRole) return false;
    
    // Root user has all permissions
    if (userWithRole.email === 'root@financeflow.com') return true;
    
    // Admin users have most permissions
    if (userWithRole.role?.name === 'admin') {
      // Admins have all permissions except root-only ones
      return true;
    }
    
    // Check specific permissions for other roles
    return userWithRole.role?.permissions?.includes(permission) || false;
  };

  const isAdmin = userWithRole?.role?.name === 'admin' || false;
  const isRoot = userWithRole?.email === 'root@financeflow.com' || false;

  return (
    <PermissionsContext.Provider 
      value={{ 
        hasPermission, 
        isAdmin: isAdmin || isRoot, 
        isRoot, 
        isLoading: loading 
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}