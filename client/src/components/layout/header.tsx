import { Menu, Bell, Calendar, Plus, 
        CreditCard, PieChart, TrendingUp, Target, ChartNoAxesCombined, ArrowLeftRight, ChartColumn, Tags, WalletCards, Handshake
       } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, Link } from 'wouter';
import { DateFilter } from '@/components/date-filter';

interface HeaderProps {
  onToggleSidebar: () => void;
  onDateRangeChange?: (range: { from: Date; to: Date } | null) => void;
  currentDateRange?: { from: Date; to: Date } | null;
}

const pageConfig: Record<string, { title: string, subtitle?: string, showDateFilter?: boolean, icon?: React.ElementType }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your finances' },
  '/notifications': { title: 'Notifications', subtitle: '', icon: Bell  },
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your finances', icon: ChartNoAxesCombined  },
  '/accounts': { title: 'Accounts', subtitle: 'Manage your financial accounts', icon: WalletCards },
  '/transactions': { title: 'Transactions', subtitle: 'Track your income and expenses', showDateFilter: true, icon : ArrowLeftRight },
  '/categories': { title: 'Categories', subtitle: 'Organize your transactions', icon : Tags },
  '/budget': { title: 'Budget', subtitle: 'Plan and track your spending', icon : Target },
  '/reports': { title: 'Reports', subtitle: 'Analyze your financial data', icon : ChartColumn },
  '/debts': { title: 'Debts', subtitle: 'Manage your debts and credits', icon : CreditCard },
  '/collaboration': { title: 'Collaboration', subtitle: 'Share workspace with others', icon : Handshake },
  '/users': { title: 'User Management', subtitle: 'Manage system users' },
  '/roles': { title: 'Role Management', subtitle: 'Manage user roles and permissions' },
  '/subscription-packages': { title: 'Subscription Packages', subtitle: 'Manage subscription plans' },
  '/subscription': { title: 'Subscription', subtitle: 'Manage your subscription plan' },
  '/profile': { title: 'Profile', subtitle: 'Manage your personal information' },
  '/settings': { title: 'Settings', subtitle: 'Configure application settings' },
  '/upgrade': { title: 'Upgrade Plan', subtitle: 'Choose your subscription package' },
};

export default function Header({ onToggleSidebar, onDateRangeChange, currentDateRange }: HeaderProps) {
  const [location] = useLocation();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const pageInfo = pageConfig[location] || { title: 'FinanceFlow' };

  return (
    <header 
      className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4"
      style={{ 
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        marginTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Menu + Title/Subtitle */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 flex-shrink-0"
          >
            <Menu size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate  flex items-center gap-2">
              {pageInfo.icon && <pageInfo.icon className="w-5 h-5 text-gray-500" />}
              {pageInfo.title}
            </h1>
            {pageInfo.subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 sm:mt-0">
                {pageInfo.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Date Filter + Notifications */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {pageInfo.showDateFilter && onDateRangeChange && (
            <DateFilter 
              onDateRangeChange={onDateRangeChange}
              currentRange={currentDateRange}
            />
          )}
          
          {!pageInfo.showDateFilter && (
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="relative p-2" data-testid="button-notifications">
                <Bell size={18} className="text-gray-600 dark:text-gray-300" />
                <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
