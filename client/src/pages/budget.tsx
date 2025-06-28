import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calculator, TrendingUp, AlertTriangle, Target, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Budget as BudgetType, Category, Transaction } from '@/types';
import AddBudgetModal from '@/components/modals/add-budget-modal';

const iconMap: Record<string, string> = {
  'briefcase': '💼',
  'shopping-cart': '🛒',
  'bolt': '⚡',
  'bus': '🚌',
  'tv': '📺',
  'home': '🏠',
  'car': '🚗',
  'heart': '❤️',
  'gamepad': '🎮',
  'coffee': '☕',
  'utensils': '🍽️',
  'shirt': '👕',
  'plane': '✈️',
  'graduation-cap': '🎓',
  'stethoscope': '🩺',
  'gift': '🎁',
  'phone': '📱',
  'wifi': '📶',
  'credit-card': '💳',
  'banknote': '💸',
  'piggy-bank': '🐷',
};

interface BudgetProps {
  workspaceId: number | undefined;
}

export default function Budget({ workspaceId }: BudgetProps) {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view budget</p>
      </div>
    );
  }

  const { data: budgets, isLoading } = useQuery<BudgetType[]>({
    queryKey: [`/api/workspaces/${workspaceId}/budgets`, selectedYear, selectedMonth],
    enabled: !!workspaceId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`],
    enabled: !!workspaceId,
  });

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(cat => cat.id === categoryId);
    if (!category) return 'Unknown Category';
    const displayIcon = iconMap[category.icon] || category.icon;
    return `${displayIcon} ${category.name}`;
  };

  const getSpentAmount = (budget: BudgetType) => {
    if (!transactions) return 0;

    const startDate = budget.period === 'monthly' 
      ? new Date(budget.year, (budget.month || 1) - 1, 1)
      : new Date(budget.year, 0, 1);

    const endDate = budget.period === 'monthly'
      ? new Date(budget.year, budget.month || 1, 0)
      : new Date(budget.year, 11, 31);

    return transactions
      .filter(transaction => 
        transaction.categoryId === budget.categoryId &&
        transaction.type === 'expense' &&
        new Date(transaction.date) >= startDate &&
        new Date(transaction.date) <= endDate
      )
      .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
  };

  const getBudgetStatus = (budget: BudgetType, spent: number) => {
    const budgetAmount = parseFloat(budget.amount);
    const percentage = (spent / budgetAmount) * 100;

    if (percentage >= 100) {
      return { color: 'text-red-600', bg: 'bg-red-100', status: 'Over Budget', icon: AlertTriangle };
    } else if (percentage >= 80) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'Near Limit', icon: TrendingUp };
    } else {
      return { color: 'text-green-600', bg: 'bg-green-100', status: 'On Track', icon: Target };
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Budget Planning</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Budget Planning</h1>
        <Button onClick={() => setShowBudgetModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Set Budget
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((month, index) => (
              <SelectItem key={index + 1} value={(index + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {budgets && budgets.length > 0 ? (
        <div className="grid gap-4">
          {budgets.map((budget) => {
            const spent = getSpentAmount(budget);
            const budgetAmount = parseFloat(budget.amount);
            const percentage = Math.min((spent / budgetAmount) * 100, 100);
            const remaining = Math.max(budgetAmount - spent, 0);
            const status = getBudgetStatus(budget, spent);
            const StatusIcon = status.icon;

            return (
              <Card key={budget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{getCategoryName(budget.categoryId)}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {budget.period === 'monthly' 
                          ? `${monthNames[(budget.month || 1) - 1]} ${budget.year}`
                          : `Year ${budget.year}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${status.bg} ${status.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Spent: Rp {spent.toLocaleString('id-ID')}</span>
                      <span>Budget: Rp {budgetAmount.toLocaleString('id-ID')}</span>
                    </div>

                    <Progress value={percentage} className="h-2" />

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        {percentage.toFixed(1)}% used
                      </div>
                      <div className={`text-sm font-medium ${
                        remaining > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {remaining > 0 
                          ? `Rp ${remaining.toLocaleString('id-ID')} remaining`
                          : `Rp ${Math.abs(remaining).toLocaleString('id-ID')} over budget`
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets set</h3>
            <p className="text-gray-600 mb-4">
              Start managing your finances by setting budgets for your expense categories.
            </p>
            <Button onClick={() => setShowBudgetModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Set Your First Budget
            </Button>
          </CardContent>
        </Card>
      )}

      <AddBudgetModal 
        open={showBudgetModal} 
        onOpenChange={setShowBudgetModal}
        workspaceId={workspaceId}
      />
    </div>
  );
}