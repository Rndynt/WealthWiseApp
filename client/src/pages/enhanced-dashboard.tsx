import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Bell,
  Calendar, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';

interface EnhancedDashboardProps {
  workspaceId: number | undefined;
}

export default function EnhancedDashboard({ workspaceId }: EnhancedDashboardProps) {
  const { data: analytics } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/analytics`],
    enabled: !!workspaceId,
  });

  const { data: debts } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  const { data: goals } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/goals`],
    enabled: !!workspaceId,
  });

  const { data: notifications } = useQuery({
    queryKey: [`/api/workspaceId/${workspaceId}/notifications`],
    enabled: !!workspaceId,
  });

  const { data: recurringTransactions } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/recurring-transactions`],
    enabled: !!workspaceId,
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a workspace to view dashboard</p>
        </div>
      </PageContainer>
    );
  }

  const activeDebts = debts?.filter(d => d.status === 'active') || [];
  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const upcomingRecurring = recurringTransactions?.filter(r => r.isActive) || [];

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enhanced Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Complete overview of your financial health</p>
        </div>

        {/* Financial Health Score */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Financial Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={analytics.financialHealthScore || 0} className="h-3" />
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.financialHealthScore || 0}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Based on your spending habits, savings rate, and debt management
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Net Worth</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics?.netWorth || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Debts</p>
                  <p className="text-2xl font-bold text-red-600">{activeDebts.length}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(activeDebts.reduce((sum, d) => sum + parseFloat(d.remainingAmount), 0))} total
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-2xl font-bold text-blue-600">{activeGoals.length}</p>
                  <p className="text-xs text-gray-500">
                    {activeGoals.filter(g => g.status === 'completed').length} completed
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Notifications</p>
                  <p className="text-2xl font-bold text-orange-600">{unreadNotifications.length}</p>
                  <p className="text-xs text-gray-500">unread alerts</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.slice(0, 3).map(goal => {
              const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{goal.name}</span>
                    <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                      {Math.round(progress)}%
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-500" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadNotifications.slice(0, 5).map(notification => (
              <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {notification.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                  {notification.type === 'info' && <Bell className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Recurring Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Upcoming Automated Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRecurring.slice(0, 5).map(recurring => (
              <div key={recurring.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">{recurring.name}</p>
                    <p className="text-sm text-gray-600">
                      {recurring.frequency} • {formatCurrency(recurring.amount)}
                    </p>
                  </div>
                </div>
                <Badge variant={recurring.isActive ? 'default' : 'secondary'}>
                  {recurring.isActive ? 'Active' : 'Paused'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}