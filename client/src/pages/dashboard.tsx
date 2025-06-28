import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, Receipt } from 'lucide-react';
import { Budget, Category, Transaction } from '@/types';

interface DashboardProps {
  workspaceId: number | undefined;
}

const iconMap: { [key: string]: React.ReactNode } = {
  'PieChart': <PieChart size={20} />,
  'TrendingUp': <TrendingUp size={20} />,
  'TrendingDown': <TrendingDown size={20} />,
  'DollarSign': <DollarSign size={20} />,
  'Wallet': <Wallet size={20} />,
  'CreditCard': <CreditCard size={20} />,
  'Receipt': <Receipt size={20} />,
};

export default function Dashboard({ workspaceId }: DashboardProps) {
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/dashboard`],
    enabled: !!workspaceId,
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: [`/api/workspaces/${workspaceId}/budgets`],
    enabled: !!workspaceId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`],
    enabled: !!workspaceId,
  });

  const isLoading = dashboardLoading || budgetsLoading || categoriesLoading || transactionsLoading;

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    if (!category) return 'Unknown Category';
    const displayIcon = iconMap[category.icon] || category.icon;
    return `${displayIcon} ${category.name}`;
  };

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view dashboard</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData ? formatCurrency(dashboardData.totalBalance) : '...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData ? formatCurrency(dashboardData.monthlyIncome) : '...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardData ? formatCurrency(dashboardData.monthlyExpenses) : '...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="text-red-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Worth</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardData ? formatCurrency(dashboardData.netWorth) : '...'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PieChart className="text-blue-600" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentTransactions?.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}

              {(!dashboardData?.recentTransactions || dashboardData.recentTransactions.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No transactions yet</p>
                  <p className="text-sm">Start by adding your first transaction</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <PieChart size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Budget tracking coming soon</p>
              <p className="text-sm">Set up your budgets to track spending</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}