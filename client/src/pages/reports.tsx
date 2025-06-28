import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Target,
  CreditCard
} from 'lucide-react';
import { Transaction, Budget, Category, Debt } from '@/types';

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

interface ReportsProps {
  workspaceId: number | undefined;
}

export default function Reports({ workspaceId }: ReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  if (!workspaceId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select a workspace to view reports</p>
      </div>
    );
  }

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`],
    enabled: !!workspaceId,
  });

  const { data: budgets } = useQuery<Budget[]>({
    queryKey: [`/api/workspaces/${workspaceId}/budgets`],
    enabled: !!workspaceId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const { data: debts } = useQuery<Debt[]>({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  // Helper functions
  const getCurrentPeriodTransactions = () => {
    if (!transactions) return [];

    const startDate = selectedPeriod === 'monthly' 
      ? new Date(selectedYear, selectedMonth - 1, 1)
      : new Date(selectedYear, 0, 1);

    const endDate = selectedPeriod === 'monthly'
      ? new Date(selectedYear, selectedMonth, 0)
      : new Date(selectedYear, 11, 31);

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  const getExpensesByCategory = () => {
    const periodTransactions = getCurrentPeriodTransactions();
    const expenses = periodTransactions.filter(t => t.type === 'expense');

    const categoryExpenses: Record<number, { amount: number; count: number; name: string; icon: string }> = {};

    expenses.forEach(expense => {
      const category = categories?.find(c => c.id === expense.categoryId);
      if (category) {
        if (!categoryExpenses[expense.categoryId]) {
          categoryExpenses[expense.categoryId] = {
            amount: 0,
            count: 0,
            name: category.name,
            icon: category.icon
          };
        }
        categoryExpenses[expense.categoryId].amount += parseFloat(expense.amount);
        categoryExpenses[expense.categoryId].count += 1;
      }
    });

    return Object.entries(categoryExpenses)
      .map(([categoryId, data]) => ({ categoryId: parseInt(categoryId), ...data }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getIncomeVsExpense = () => {
    const periodTransactions = getCurrentPeriodTransactions();
    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const expense = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return { income, expense, balance: income - expense };
  };

  const getBudgetPerformance = () => {
    if (!budgets || !transactions) return [];

    return budgets.map(budget => {
      const spent = transactions
        .filter(t => 
          t.categoryId === budget.categoryId &&
          t.type === 'expense' &&
          new Date(t.date).getFullYear() === budget.year &&
          (budget.period === 'yearly' || new Date(t.date).getMonth() + 1 === budget.month)
        )
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const budgetAmount = parseFloat(budget.amount);
      const percentage = (spent / budgetAmount) * 100;
      const category = categories?.find(c => c.id === budget.categoryId);

      return {
        ...budget,
        spent,
        percentage: Math.min(percentage, 100),
        remaining: Math.max(budgetAmount - spent, 0),
        categoryName: category ? category.name : 'Unknown',
        status: percentage >= 100 ? 'over' : percentage >= 80 ? 'warning' : 'good'
      };
    }).sort((a, b) => b.percentage - a.percentage);
  };

  const getTotalDebtCredit = () => {
    if (!debts) return { totalDebt: 0, totalCredit: 0, netPosition: 0 };

    const totalDebt = debts
      .filter(d => d.type === 'debt' && d.status !== 'paid')
      .reduce((sum, d) => sum + parseFloat(d.remainingAmount), 0);

    const totalCredit = debts
      .filter(d => d.type === 'credit' && d.status !== 'paid')
      .reduce((sum, d) => sum + parseFloat(d.remainingAmount), 0);

    return {
      totalDebt,
      totalCredit,
      netPosition: totalCredit - totalDebt
    };
  };

  const expensesByCategory = getExpensesByCategory();
  const incomeVsExpense = getIncomeVsExpense();
  const budgetPerformance = getBudgetPerformance();
  const debtSummary = getTotalDebtCredit();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {selectedPeriod === 'monthly' && (
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month.slice(0, 3)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
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
        </div>
      </div>

      {/* Income vs Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  Rp {incomeVsExpense.income.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">
                  Rp {incomeVsExpense.expense.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                incomeVsExpense.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                <DollarSign className={`h-6 w-6 ${
                  incomeVsExpense.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${
                  incomeVsExpense.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  Rp {Math.abs(incomeVsExpense.balance).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length > 0 ? (
            <div className="space-y-4">
              {expensesByCategory.map((category, index) => {
                const totalExpense = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);
                const percentage = (category.amount / totalExpense) * 100;

                return (
                  <div key={category.categoryId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <span className="text-lg">{iconMap[category.icon] || category.icon}</span>
                        {category.name}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          Rp {category.amount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage.toFixed(1)}% • {category.count} transactions
                        </div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No expense data for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Performance */}
      {budgetPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Budget Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetPerformance.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{budget.categoryName}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        budget.status === 'over' ? 'bg-red-100 text-red-600' :
                        budget.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }>
                        {budget.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={budget.percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Spent: Rp {budget.spent.toLocaleString('id-ID')}</span>
                    <span>Budget: Rp {parseFloat(budget.amount).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debt Summary */}
      {debts && debts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Debt & Credit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Debt</div>
                <div className="text-xl font-bold text-red-600">
                  Rp {debtSummary.totalDebt.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Credit</div>
                <div className="text-xl font-bold text-green-600">
                  Rp {debtSummary.totalCredit.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Net Position</div>
                <div className={`text-xl font-bold ${
                  debtSummary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Rp {Math.abs(debtSummary.netPosition).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}