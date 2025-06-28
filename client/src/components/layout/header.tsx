import { Menu, Bell, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/categories': 'Categories',
  '/budget': 'Budget',
  '/reports': 'Reports',
  '/debts': 'Debts',
  '/collaboration': 'Collaboration',
};

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu size={20} />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {pageTitles[location] || 'FinanceFlow'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>{currentDate}</span>
          </div>
          <Button variant="ghost" size="sm" className="relative">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>
        </div>
      </div>
    </header>
  );
}
