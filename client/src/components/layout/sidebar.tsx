import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tags, Calculator,
  BarChart3, CreditCard, Users, ChartLine, Settings, LogOut,
  Crown, Plus, Shield, UserCog, Package, User, Star, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { 
  useEnhancedPermissions, 
  ENHANCED_PERMISSIONS
} from '@/lib/enhanced-permissions';
import { Workspace } from '@/types';
import AddWorkspaceModal from '@/components/modals/add-workspace-modal';

// UserSubscriptionBadge component
function UserSubscriptionBadge1({ packageName }: { packageName?: string }) {
  if (!packageName) return null;

  const badgeVariant = packageName.toLowerCase() === 'premium' ? 'default' : 'secondary';
  const badgeText = packageName.toLowerCase() === 'premium' ? 'Premium' : 'Basic';

  return (
    <Badge variant={badgeVariant} className="text-xs">
      {badgeText}
    </Badge>
  );
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
}

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, pagePermission: ENHANCED_PERMISSIONS.USER_DASHBOARD_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_DASHBOARD_ACCESS },
  { path: '/accounts', label: 'Accounts', icon: Wallet, pagePermission: ENHANCED_PERMISSIONS.USER_ACCOUNTS_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_ACCOUNTS_ACCESS },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight, pagePermission: ENHANCED_PERMISSIONS.USER_TRANSACTIONS_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_TRANSACTIONS_ACCESS },
  { path: '/categories', label: 'Categories', icon: Tags, pagePermission: ENHANCED_PERMISSIONS.USER_CATEGORIES_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_CATEGORIES_ACCESS },
  { path: '/budget', label: 'Budget', icon: Calculator, pagePermission: ENHANCED_PERMISSIONS.USER_BUDGETS_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_BUDGETS_ACCESS },
  { path: '/reports', label: 'Reports', icon: BarChart3, pagePermission: ENHANCED_PERMISSIONS.USER_REPORTS_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_REPORTS_ACCESS },
  { path: '/debts', label: 'Debts', icon: CreditCard, pagePermission: ENHANCED_PERMISSIONS.USER_DEBTS_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_DEBTS_ACCESS },
  { path: '/collaboration', label: 'Collaboration', icon: Users, pagePermission: ENHANCED_PERMISSIONS.USER_COLLABORATION_PAGES, accessPermission: ENHANCED_PERMISSIONS.USER_COLLABORATION_ACCESS },
];

const adminNavigationItems = [
  { path: '/users', label: 'User Management', icon: UserCog, pagePermission: ENHANCED_PERMISSIONS.ADMIN_USERS_PAGES, accessPermission: ENHANCED_PERMISSIONS.ADMIN_USERS_ACCESS },
  { path: '/roles', label: 'Role Management', icon: Shield, pagePermission: ENHANCED_PERMISSIONS.ADMIN_ROLES_PAGES, accessPermission: ENHANCED_PERMISSIONS.ADMIN_ROLES_ACCESS },
  { path: '/subscription-packages', label: 'Subscription Packages', icon: Package, pagePermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_PAGES, accessPermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_ACCESS },
  { path: '/user-subscriptions', label: 'User Subscriptions', icon: Crown, pagePermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_PAGES, accessPermission: ENHANCED_PERMISSIONS.ADMIN_SUBSCRIPTIONS_ACCESS },
  { path: '/settings', label: 'App Settings', icon: Settings, pagePermission: ENHANCED_PERMISSIONS.ADMIN_SETTINGS_PAGES, accessPermission: ENHANCED_PERMISSIONS.ADMIN_SETTINGS_ACCESS },
];

// UserSubscriptionBadge Component
function UserSubscriptionBadge() {
  const { data: subscriptionLimits, isLoading } = useQuery<{ maxWorkspaces: number; maxMembers: number; currentWorkspaces: number }>({
    queryKey: ['/api/user/subscription-limits'],
  });

  const { data: userSubscription } = useQuery<{ subscription: any; package: { name: string; canCreateSharedWorkspace: boolean } } | null>({
    queryKey: ['/api/user/subscription'],
    enabled: !!subscriptionLimits,
  });

  if (isLoading || !subscriptionLimits) {
    return null;
  }

  // Get package name from user subscription or default to 'basic'
  const packageName = userSubscription?.package?.name || 'basic';

  const getBadgeVariant = () => {
    switch (packageName?.toLowerCase()) {
      case 'premium':
      case 'pro':
      case 'professional':
      case 'business':
        return 'default';
      case 'basic':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBadgeIcon = () => {
    switch (packageName?.toLowerCase()) {
      case 'premium':
      case 'pro':
      case 'professional':
      case 'business':
        return <Crown size={12} className="mr-1" />;
      case 'basic':
        return <Star size={12} className="mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Badge variant={getBadgeVariant()} className="w-full justify-center text-xs">
      {getBadgeIcon()}
      {packageName ? packageName.charAt(0).toUpperCase() + packageName.slice(1) : 'Basic'}
    </Badge>
  );
}

export default function Sidebar({ open, onToggle, currentWorkspace, onWorkspaceChange }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { hasPermission, hasPageAccess, hasFeatureAccess, isAdmin, isRoot, isLoading: permissionsLoading } = useEnhancedPermissions();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const { data: workspaces, isLoading: workspacesLoading } = useQuery<Workspace[]>({
    queryKey: ['/api/workspaces'],
    enabled: !!user,
  });

  // Set initial workspace
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !currentWorkspace) {
      const personalWorkspace = workspaces.find(w => w.type === 'personal') || workspaces[0];
      onWorkspaceChange(personalWorkspace);
    }
  }, [workspaces, currentWorkspace, onWorkspaceChange]);

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces?.find(w => w.id === parseInt(workspaceId));
    if (workspace) {
      onWorkspaceChange(workspace);
    }
  };

  


  return (
    <>
      {/* Sidebar overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden overflow-hidden"
          onClick={onToggle}
          onTouchMove={(e) => e.preventDefault()}
          data-testid="sidebar-overlay"
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-40 transition-transform duration-300 flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ChartLine className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">FinanceFlow</h1>
              <p className="text-xs text-gray-600">Financial Management</p>
            </div>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-2">Select workspace</label>
          <div className="flex items-center gap-2">
            <Select
              value={currentWorkspace?.id.toString() || ''}
              onValueChange={handleWorkspaceChange}
              disabled={workspacesLoading || permissionsLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select workspace..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces?.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id.toString()}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWorkspaceModal(true)}
              className="px-2"
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
          {navigationItems.map((item) => {
            // Check permission using the correct format from pagePermission
            if (!hasPageAccess && item.pagePermission && !hasPermission(item.pagePermission)) return null;

            const Icon = item.icon;
            const isActive = location === item.path || (item.path === '/dashboard' && location === '/');

            return (
              <Link key={item.path} href={item.path} className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-blue-50 text-primary'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}>
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          </nav>

          {/* Admin Section */}
          {(isAdmin || isRoot) && !permissionsLoading && (
            <>
              {adminNavigationItems.some(item => item.pagePermission && hasPermission(item.pagePermission)) && (
                <div className="px-4 py-2">
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Admin
                    </h3>
                    <div className="space-y-1">
                      {adminNavigationItems.map((item) => {
                        // Check permission using the correct format from pagePermission
                        if (item.pagePermission && !hasPermission(item.pagePermission)) return null;

                        const Icon = item.icon;
                        const isActive = location === item.path;

                        return (
                          <Link key={item.path} href={item.path} className={`
                            flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                            ${isActive
                              ? 'bg-blue-50 text-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}>
                            <Icon size={18} />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User Profile Section - Ultra Compact */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
          {/* User Badge with Actions - Very Compact */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 h-6 w-6"
                  data-testid="button-profile"
                >
                  <User size={12} />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 h-6 w-6"
                data-testid="button-logout"
              >
                <LogOut size={12} />
              </Button>
            </div>
          </div>

          {/* Single Line Plan + Upgrade */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500">Plan:</span>
              <Badge variant="default" className="text-[8px] px-1 py-0 h-4">Premium</Badge>
            </div>
            {!isAdmin && !isRoot && (
              <Link href="/upgrade">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-[9px] font-medium px-2 py-0.5 h-5"
                >
                  <Zap size={8} className="mr-0.5" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <AddWorkspaceModal
        open={showWorkspaceModal}
        onOpenChange={setShowWorkspaceModal}
      />
    </>
  );
}