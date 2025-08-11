import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tags, Calculator,
  BarChart3, CreditCard, Users, ChartLine, Settings, LogOut,
  ChevronDown, Plus, Shield, UserCog, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { Workspace } from '@/types';
import AddWorkspaceModal from '@/components/modals/add-workspace-modal';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  currentWorkspace: Workspace | null;
  onWorkspaceChange: (workspace: Workspace) => void;
}

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/categories', label: 'Categories', icon: Tags },
  { path: '/budget', label: 'Budget', icon: Calculator },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/debts', label: 'Debts', icon: CreditCard },
  { path: '/collaboration', label: 'Collaboration', icon: Users },
];

const adminNavigationItems = [
  { path: '/users', label: 'User Management', icon: UserCog },
  { path: '/roles', label: 'Role Management', icon: Shield },
  { path: '/subscription-packages', label: 'Subscription Packages', icon: Package },
];

export default function Sidebar({ open, onToggle, currentWorkspace, onWorkspaceChange }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const { data: workspaces, isLoading } = useQuery<Workspace[]>({
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-40 transition-transform duration-300
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
              disabled={isLoading}
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
        <nav className="p-4 space-y-1 flex-1">
          {navigationItems.map((item) => {
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
        <div className="px-4 py-2">
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Admin
            </h3>
            <div className="space-y-1">
              {adminNavigationItems.map((item) => {
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

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <LogOut size={16} />
            </Button>
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
