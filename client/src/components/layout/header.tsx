import { Menu, Bell, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface HeaderProps {
  onToggleSidebar: () => void;
  onAddAction?: () => void;
}

const pageConfig: Record<string, { title: string, subtitle?: string, hasAddButton?: boolean }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your finances' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your finances' },
  '/accounts': { title: 'Accounts', subtitle: 'Manage your financial accounts', hasAddButton: true },
  '/transactions': { title: 'Transactions', subtitle: 'Track your income and expenses', hasAddButton: true },
  '/categories': { title: 'Categories', subtitle: 'Organize your transactions', hasAddButton: true },
  '/budget': { title: 'Budget', subtitle: 'Plan and track your spending', hasAddButton: true },
  '/reports': { title: 'Reports', subtitle: 'Analyze your financial data' },
  '/debts': { title: 'Debts', subtitle: 'Manage your debts and credits', hasAddButton: true },
  '/collaboration': { title: 'Collaboration', subtitle: 'Share workspace with others' },
  '/users': { title: 'User Management', subtitle: 'Manage system users' },
  '/roles': { title: 'Role Management', subtitle: 'Manage user roles and permissions' },
  '/subscription-packages': { title: 'Subscription Packages', subtitle: 'Manage subscription plans' },
  '/subscription': { title: 'Subscription', subtitle: 'Manage your subscription plan' },
  '/profile': { title: 'Profile', subtitle: 'Manage your personal information' },
  '/settings': { title: 'Settings', subtitle: 'Configure application settings' },
};

export default function Header({ onToggleSidebar, onAddAction }: HeaderProps) {
  const [location] = useLocation();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const pageInfo = pageConfig[location] || { title: 'FinanceFlow' };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        {/* Top row: Menu + Title/Subtitle */}
        <div className="flex items-center justify-between sm:justify-start">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="lg:hidden p-2"
            >
              <Menu size={20} />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                {pageInfo.title}
              </h1>
              {pageInfo.subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 sm:mt-0">
                  {pageInfo.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Mobile action button */}
          {pageInfo.hasAddButton && onAddAction && (
            <Button
              size="sm"
              onClick={onAddAction}
              className="sm:hidden ml-2 flex-shrink-0"
            >
              <Plus size={16} />
            </Button>
          )}
        </div>

        {/* Bottom row: Date + Notifications + Actions */}
        <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <Calendar size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{currentDate}</span>
            <span className="xs:hidden">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell size={18} className="text-gray-600 dark:text-gray-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
            </Button>

            {/* Desktop action button */}
            {pageInfo.hasAddButton && onAddAction && (
              <Button
                size="sm"
                onClick={onAddAction}
                className="hidden sm:flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
