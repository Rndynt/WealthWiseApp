// NEW RBAC SCHEMA WITH ENHANCED SECURITY
import { z } from "zod";

// Enhanced Role Definition
export const ROLES = {
  ROOT: { id: 1, name: 'root', priority: 0 },
  ADMIN: { id: 2, name: 'admin', priority: 1 },  
  USER_BASIC: { id: 3, name: 'user_basic', priority: 2 },
  USER_PREMIUM: { id: 4, name: 'user_premium', priority: 3 }
} as const;

// Enhanced Permission Categories with Admin/User Separation
export const PERMISSION_CATEGORIES = {
  // Admin-only operations (prefix: admin.*)
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles', 
  ADMIN_PERMISSIONS: 'admin.permissions',
  ADMIN_SUBSCRIPTIONS: 'admin.subscriptions',
  ADMIN_SETTINGS: 'admin.settings',
  ADMIN_SYSTEM: 'admin.system',
  
  // User operations (prefix: user.*)
  USER_DASHBOARD: 'user.dashboard',
  USER_ACCOUNTS: 'user.accounts',
  USER_TRANSACTIONS: 'user.transactions',
  USER_CATEGORIES: 'user.categories',
  USER_BUDGETS: 'user.budgets',
  USER_REPORTS: 'user.reports',
  USER_DEBTS: 'user.debts',
  USER_COLLABORATION: 'user.collaboration',
  USER_WORKSPACES: 'user.workspaces',
  USER_PROFILE: 'user.profile',
  USER_SUBSCRIPTION: 'user.subscription'
} as const;

// Enhanced Permission Actions
export const PERMISSION_ACTIONS = {
  // Navigation & UI
  PAGES: 'pages',    // Can see menu item
  ACCESS: 'access',  // Can access the feature
  
  // CRUD Operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Special Actions
  MANAGE: 'manage',
  INVITE: 'invite',
  EXPORT: 'export',
  UPGRADE: 'upgrade',
  BYPASS: 'bypass'   // Root-only bypass flag
} as const;

// Permission Schema
export const permissionSchema = z.object({
  name: z.string(),
  category: z.enum([
    'admin.users', 'admin.roles', 'admin.permissions', 'admin.subscriptions', 
    'admin.settings', 'admin.system',
    'user.dashboard', 'user.accounts', 'user.transactions', 'user.categories',
    'user.budgets', 'user.reports', 'user.debts', 'user.collaboration',
    'user.workspaces', 'user.profile', 'user.subscription'
  ]),
  action: z.enum(['pages', 'access', 'create', 'read', 'update', 'delete', 'manage', 'invite', 'export', 'upgrade', 'bypass']),
  description: z.string(),
  isAdminOnly: z.boolean().default(false),
  requiresSubscription: z.enum(['basic', 'premium', 'professional', 'business']).nullable(),
});

// Role Permission Schema with Subscription Constraints
export const rolePermissionSchema = z.object({
  roleId: z.number(),
  permissionName: z.string(),
  subscriptionRequired: z.enum(['basic', 'premium', 'professional', 'business']).nullable(),
  isInherited: z.boolean().default(false),
  canDelegate: z.boolean().default(false), // Can grant this permission to workspace members
});

// New Enhanced Permissions List
export const ENHANCED_PERMISSIONS = [
  // ROOT BYPASS - Universal access
  { name: 'root.bypass', category: 'admin.system', action: 'bypass', description: 'Root user bypass all checks', isAdminOnly: true },
  
  // ADMIN PERMISSIONS
  { name: 'admin.users.pages', category: 'admin.users', action: 'pages', description: 'See User Management menu', isAdminOnly: true },
  { name: 'admin.users.access', category: 'admin.users', action: 'access', description: 'Access User Management page', isAdminOnly: true },
  { name: 'admin.users.create', category: 'admin.users', action: 'create', description: 'Create new users', isAdminOnly: true },
  { name: 'admin.users.read', category: 'admin.users', action: 'read', description: 'View user data', isAdminOnly: true },
  { name: 'admin.users.update', category: 'admin.users', action: 'update', description: 'Update user data', isAdminOnly: true },
  { name: 'admin.users.delete', category: 'admin.users', action: 'delete', description: 'Delete users', isAdminOnly: true },
  
  { name: 'admin.roles.pages', category: 'admin.roles', action: 'pages', description: 'See Role Management menu', isAdminOnly: true },
  { name: 'admin.roles.access', category: 'admin.roles', action: 'access', description: 'Access Role Management page', isAdminOnly: true },
  { name: 'admin.roles.create', category: 'admin.roles', action: 'create', description: 'Create new roles', isAdminOnly: true },
  { name: 'admin.roles.read', category: 'admin.roles', action: 'read', description: 'View role data', isAdminOnly: true },
  { name: 'admin.roles.update', category: 'admin.roles', action: 'update', description: 'Update role data', isAdminOnly: true },
  { name: 'admin.roles.delete', category: 'admin.roles', action: 'delete', description: 'Delete roles', isAdminOnly: true },
  
  { name: 'admin.subscriptions.pages', category: 'admin.subscriptions', action: 'pages', description: 'See Subscription Management menu', isAdminOnly: true },
  { name: 'admin.subscriptions.access', category: 'admin.subscriptions', action: 'access', description: 'Access Subscription Management', isAdminOnly: true },
  { name: 'admin.subscriptions.manage', category: 'admin.subscriptions', action: 'manage', description: 'Manage all subscriptions', isAdminOnly: true },
  
  { name: 'admin.settings.pages', category: 'admin.settings', action: 'pages', description: 'See App Settings menu', isAdminOnly: true },
  { name: 'admin.settings.access', category: 'admin.settings', action: 'access', description: 'Access App Settings', isAdminOnly: true },
  { name: 'admin.settings.update', category: 'admin.settings', action: 'update', description: 'Update app settings', isAdminOnly: true },
  
  // USER PERMISSIONS - Dashboard
  { name: 'user.dashboard.pages', category: 'user.dashboard', action: 'pages', description: 'See Dashboard menu' },
  { name: 'user.dashboard.access', category: 'user.dashboard', action: 'access', description: 'Access Dashboard' },
  
  // USER PERMISSIONS - Accounts  
  { name: 'user.accounts.pages', category: 'user.accounts', action: 'pages', description: 'See Accounts menu' },
  { name: 'user.accounts.access', category: 'user.accounts', action: 'access', description: 'Access Accounts page' },
  { name: 'user.accounts.create', category: 'user.accounts', action: 'create', description: 'Create accounts' },
  { name: 'user.accounts.read', category: 'user.accounts', action: 'read', description: 'View account data' },
  { name: 'user.accounts.update', category: 'user.accounts', action: 'update', description: 'Update accounts' },
  { name: 'user.accounts.delete', category: 'user.accounts', action: 'delete', description: 'Delete accounts' },
  
  // USER PERMISSIONS - Transactions
  { name: 'user.transactions.pages', category: 'user.transactions', action: 'pages', description: 'See Transactions menu' },
  { name: 'user.transactions.access', category: 'user.transactions', action: 'access', description: 'Access Transactions page' },
  { name: 'user.transactions.create', category: 'user.transactions', action: 'create', description: 'Create transactions' },
  { name: 'user.transactions.read', category: 'user.transactions', action: 'read', description: 'View transaction data' },
  { name: 'user.transactions.update', category: 'user.transactions', action: 'update', description: 'Update transactions' },
  { name: 'user.transactions.delete', category: 'user.transactions', action: 'delete', description: 'Delete transactions' },
  
  // USER PERMISSIONS - Categories
  { name: 'user.categories.pages', category: 'user.categories', action: 'pages', description: 'See Categories menu' },
  { name: 'user.categories.access', category: 'user.categories', action: 'access', description: 'Access Categories page' },
  { name: 'user.categories.create', category: 'user.categories', action: 'create', description: 'Create categories', requiresSubscription: 'basic' },
  { name: 'user.categories.read', category: 'user.categories', action: 'read', description: 'View category data' },
  { name: 'user.categories.update', category: 'user.categories', action: 'update', description: 'Update categories' },
  { name: 'user.categories.delete', category: 'user.categories', action: 'delete', description: 'Delete categories' },
  
  // USER PERMISSIONS - Budgets
  { name: 'user.budgets.pages', category: 'user.budgets', action: 'pages', description: 'See Budget menu' },
  { name: 'user.budgets.access', category: 'user.budgets', action: 'access', description: 'Access Budget page' },
  { name: 'user.budgets.create', category: 'user.budgets', action: 'create', description: 'Create budgets', requiresSubscription: 'basic' },
  { name: 'user.budgets.read', category: 'user.budgets', action: 'read', description: 'View budget data' },
  { name: 'user.budgets.update', category: 'user.budgets', action: 'update', description: 'Update budgets' },
  { name: 'user.budgets.delete', category: 'user.budgets', action: 'delete', description: 'Delete budgets' },
  
  // USER PERMISSIONS - Reports
  { name: 'user.reports.pages', category: 'user.reports', action: 'pages', description: 'See Reports menu' },
  { name: 'user.reports.access', category: 'user.reports', action: 'access', description: 'Access Reports page' },
  { name: 'user.reports.read', category: 'user.reports', action: 'read', description: 'View reports' },
  { name: 'user.reports.export', category: 'user.reports', action: 'export', description: 'Export reports', requiresSubscription: 'premium' },
  
  // USER PERMISSIONS - Debts
  { name: 'user.debts.pages', category: 'user.debts', action: 'pages', description: 'See Debts menu' },
  { name: 'user.debts.access', category: 'user.debts', action: 'access', description: 'Access Debts page' },
  { name: 'user.debts.create', category: 'user.debts', action: 'create', description: 'Create debt records' },
  { name: 'user.debts.read', category: 'user.debts', action: 'read', description: 'View debt data' },
  { name: 'user.debts.update', category: 'user.debts', action: 'update', description: 'Update debt records' },
  { name: 'user.debts.delete', category: 'user.debts', action: 'delete', description: 'Delete debt records' },
  
  // USER PERMISSIONS - Collaboration
  { name: 'user.collaboration.pages', category: 'user.collaboration', action: 'pages', description: 'See Collaboration menu', requiresSubscription: 'professional' },
  { name: 'user.collaboration.access', category: 'user.collaboration', action: 'access', description: 'Access Collaboration page', requiresSubscription: 'professional' },
  { name: 'user.collaboration.invite', category: 'user.collaboration', action: 'invite', description: 'Invite workspace members', requiresSubscription: 'professional' },
  { name: 'user.collaboration.manage', category: 'user.collaboration', action: 'manage', description: 'Manage workspace members', requiresSubscription: 'professional' },
  
  // USER PERMISSIONS - Workspaces
  { name: 'user.workspaces.pages', category: 'user.workspaces', action: 'pages', description: 'See workspace selector' },
  { name: 'user.workspaces.access', category: 'user.workspaces', action: 'access', description: 'Access workspaces' },
  { name: 'user.workspaces.create', category: 'user.workspaces', action: 'create', description: 'Create workspaces', requiresSubscription: 'basic' },
  { name: 'user.workspaces.read', category: 'user.workspaces', action: 'read', description: 'View workspace data' },
  { name: 'user.workspaces.update', category: 'user.workspaces', action: 'update', description: 'Update workspaces' },
  { name: 'user.workspaces.delete', category: 'user.workspaces', action: 'delete', description: 'Delete workspaces' },
  
  // USER PERMISSIONS - Profile
  { name: 'user.profile.pages', category: 'user.profile', action: 'pages', description: 'See Profile menu' },
  { name: 'user.profile.access', category: 'user.profile', action: 'access', description: 'Access Profile page' },
  { name: 'user.profile.update', category: 'user.profile', action: 'update', description: 'Update profile' },
  
  // USER PERMISSIONS - Subscription
  { name: 'user.subscription.pages', category: 'user.subscription', action: 'pages', description: 'See Subscription menu' },
  { name: 'user.subscription.access', category: 'user.subscription', action: 'access', description: 'Access Subscription page' },
  { name: 'user.subscription.upgrade', category: 'user.subscription', action: 'upgrade', description: 'Upgrade subscription' },
];

// Role-Permission Mapping with Subscription Enforcement
export const ROLE_PERMISSIONS = {
  [ROLES.ROOT.id]: ENHANCED_PERMISSIONS.map(p => p.name), // Root gets all permissions
  
  [ROLES.ADMIN.id]: ENHANCED_PERMISSIONS
    .filter(p => p.isAdminOnly || !p.name.startsWith('user.'))
    .map(p => p.name),
    
  [ROLES.USER_BASIC.id]: ENHANCED_PERMISSIONS
    .filter(p => !p.isAdminOnly && (!p.requiresSubscription || p.requiresSubscription === 'basic'))
    .map(p => p.name),
    
  [ROLES.USER_PREMIUM.id]: ENHANCED_PERMISSIONS
    .filter(p => !p.isAdminOnly && (!p.requiresSubscription || ['basic', 'premium'].includes(p.requiresSubscription)))
    .map(p => p.name)
};