import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Target, Bell,
  Calendar, AlertTriangle, CheckCircle, Clock, Wallet, PieChart,
  BarChart3, Users, FileText, Archive, Plus
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';

interface ComprehensiveDashboardProps {
  workspaceId: number | undefined;
}

export default function ComprehensiveDashboard({ workspaceId }: ComprehensiveDashboardProps) {
  // Fetch all required data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/dashboard`],
    enabled: !!workspaceId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/analytics`],
    enabled: !!workspaceId,
  });

  const { data: financialHealth, isLoading: healthLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/financial-health`],
    enabled: !!workspaceId,
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  const { data: debts, isLoading: debtsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/goals`],
    enabled: !!workspaceId,
  });

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/budgets`],
    enabled: !!workspaceId,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/transactions`],
    enabled: !!workspaceId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const isLoading = dashboardLoading || analyticsLoading || healthLoading || 
    accountsLoading || debtsLoading || goalsLoading || budgetsLoading || 
    transactionsLoading || categoriesLoading;

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500">Pilih workspace untuk melihat dashboard</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  // Calculate financial metrics
  const totalBalance = dashboardData?.totalBalance ? parseFloat(dashboardData.totalBalance) : 0;
  const monthlyIncome = dashboardData?.monthlyIncome ? parseFloat(dashboardData.monthlyIncome) : 0;
  const monthlyExpenses = dashboardData?.monthlyExpenses ? parseFloat(dashboardData.monthlyExpenses) : 0;
  const netWorth = totalBalance;
  
  const totalDebt = debts ? debts.reduce((sum: number, debt: any) => 
    sum + parseFloat(debt.remainingAmount || 0), 0) : 0;
  
  const activeGoals = goals ? goals.filter((g: any) => g.status === 'active') : [];
  const completedGoals = goals ? goals.filter((g: any) => g.status === 'completed') : [];
  
  const accountsBalance = accounts ? accounts.reduce((sum: number, acc: any) => 
    sum + parseFloat(acc.balance || 0), 0) : 0;

  // Recent transactions for this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthTransactions = transactions?.filter((t: any) => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
  }) || [];

  const thisMonthIncome = thisMonthTransactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const thisMonthExpenses = thisMonthTransactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  // Budget analysis
  const budgetAnalysis = budgets ? budgets.map((budget: any) => {
    const spent = thisMonthTransactions
      .filter((t: any) => t.categoryId === budget.categoryId && t.type === 'expense')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
    
    const budgetAmount = parseFloat(budget.amount);
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    
    return {
      ...budget,
      spent,
      percentage,
      remaining: Math.max(0, budgetAmount - spent),
      isOverBudget: spent > budgetAmount
    };
  }) : [];

  const overBudgetCount = budgetAnalysis.filter((b: any) => b.isOverBudget).length;
  const totalBudgeted = budgetAnalysis.reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0);
  const totalSpent = budgetAnalysis.reduce((sum: number, b: any) => sum + b.spent, 0);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Keuangan</h1>
            <p className="text-gray-600 dark:text-gray-400">Ringkasan lengkap kondisi keuangan Anda</p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Badge variant="outline">
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </Badge>
          </div>
        </div>

        {/* Main Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Saldo</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {accounts ? accounts.length : 0} akun aktif
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Wallet className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pemasukan Bulan Ini</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(thisMonthIncome)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {formatCurrency(monthlyIncome)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pengeluaran Bulan Ini</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(thisMonthExpenses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {formatCurrency(monthlyExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Worth</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(netWorth - totalDebt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Utang: {formatCurrency(totalDebt)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Health Score */}
        {financialHealth && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skor Kesehatan Keuangan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${
                    (financialHealth as any).score >= 80 ? 'text-green-600' : 
                    (financialHealth as any).score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round((financialHealth as any).score || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Skor Keseluruhan</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Rasio Utang</span>
                    <Badge variant={(financialHealth as any).debtToIncomeRatio < 0.3 ? 'default' : 'destructive'}>
                      {((financialHealth as any).debtToIncomeRatio * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min((financialHealth as any).debtToIncomeRatio * 100, 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Tingkat Tabungan</span>
                    <Badge variant={(financialHealth as any).savingsRate > 0.1 ? 'default' : 'secondary'}>
                      {((financialHealth as any).savingsRate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={Math.min((financialHealth as any).savingsRate * 100, 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Kepatuhan Budget</span>
                    <Badge variant={(financialHealth as any).budgetCompliance > 0.8 ? 'default' : 'secondary'}>
                      {((financialHealth as any).budgetCompliance * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={(financialHealth as any).budgetCompliance * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Overview & Budget Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Ringkasan Akun
                </span>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(accounts || []).slice(0, 4).map((account: any) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Wallet className="text-blue-600 dark:text-blue-400" size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(account.balance)}</p>
                    </div>
                  </div>
                ))}
                
                {(!accounts || accounts.length === 0) && (
                  <div className="text-center py-4 text-gray-500">
                    <p>Belum ada akun</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Tambah Akun Pertama
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Analisis Budget
                </span>
                <Badge variant={overBudgetCount > 0 ? 'destructive' : 'default'}>
                  {overBudgetCount} over budget
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Budget:</span>
                  <span className="font-semibold">{formatCurrency(totalBudgeted)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Terpakai:</span>
                  <span className="font-semibold">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sisa Budget:</span>
                  <span className={`font-semibold ${totalBudgeted - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalBudgeted - totalSpent)}
                  </span>
                </div>
                <Progress 
                  value={totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0} 
                  className="h-2"
                />
                
                {budgetAnalysis.slice(0, 3).map((budget: any) => (
                  <div key={budget.id} className="flex items-center justify-between text-sm">
                    <span>{(categories || []).find((c: any) => c.id === budget.categoryId)?.name || 'Unknown'}</span>
                    <span className={budget.isOverBudget ? 'text-red-600' : 'text-gray-600'}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals & Debts Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals Progress
                </span>
                <Badge variant="outline">
                  {activeGoals.length} aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeGoals.slice(0, 3).map((goal: any) => {
                  const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{goal.title}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                        <Badge variant={progress >= 100 ? 'default' : 'secondary'}>
                          {Math.round(progress)}%
                        </Badge>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                    </div>
                  );
                })}

                {activeGoals.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p>Belum ada goals aktif</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Buat Goal Pertama
                    </Button>
                  </div>
                )}

                {completedGoals.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-green-600">
                      <CheckCircle className="inline w-4 h-4 mr-1" />
                      {completedGoals.length} goals selesai
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Debt Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Ringkasan Utang
                </span>
                <Badge variant={totalDebt > 0 ? 'destructive' : 'default'}>
                  {formatCurrency(totalDebt)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {debts?.filter((d: any) => d.type === 'debt').slice(0, 3).map((debt: any) => {
                  const nextPayment = debt.nextPaymentDate ? new Date(debt.nextPaymentDate) : null;
                  const monthlyDate = debt.monthlyPaymentDate;
                  const progress = ((parseFloat(debt.totalAmount) - parseFloat(debt.remainingAmount)) / parseFloat(debt.totalAmount)) * 100;
                  
                  return (
                    <div key={debt.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{debt.name}</p>
                          <div className="flex flex-col text-xs text-gray-500">
                            <span>Jatuh tempo akhir: {new Date(debt.dueDate).toLocaleDateString('id-ID')}</span>
                            {monthlyDate && (
                              <span>Pembayaran bulanan: tanggal {monthlyDate}</span>
                            )}
                            {nextPayment && (
                              <span className="text-orange-600 font-medium">
                                Pembayaran berikutnya: {nextPayment.toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(debt.remainingAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            dari {formatCurrency(debt.totalAmount)}
                          </p>
                          {debt.monthlyPaymentAmount && (
                            <p className="text-xs text-blue-600">
                              {formatCurrency(debt.monthlyPaymentAmount)}/bulan
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                {totalDebt === 0 && (
                  <div className="text-center py-4 text-green-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Bebas utang! 🎉</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {((dashboardData as any)?.recentTransactions || []).slice(0, 5).map((transaction: any) => {
                // Enhanced transaction information
                const getTransactionDetails = (tx: any) => {
                  const account = (accounts || []).find((a: any) => a.id === tx.accountId);
                  const toAccount = tx.toAccountId ? (accounts || []).find((a: any) => a.id === tx.toAccountId) : null;
                  const category = (categories || []).find((c: any) => c.id === tx.categoryId);
                  const debt = tx.debtId ? (debts || []).find((d: any) => d.id === tx.debtId) : null;
                  
                  let details = '';
                  let icon = <CreditCard size={16} />;
                  let colorClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
                  
                  switch (tx.type) {
                    case 'income':
                      details = `Masuk ke ${account?.name || 'Unknown'} • ${category?.name || 'Income'}`;
                      icon = <TrendingUp size={16} />;
                      colorClass = 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
                      break;
                    case 'expense':
                      details = `Dari ${account?.name || 'Unknown'} • ${category?.name || 'Expense'}`;
                      icon = <TrendingDown size={16} />;
                      colorClass = 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
                      break;
                    case 'transfer':
                      details = `Transfer ${account?.name || 'Unknown'} → ${toAccount?.name || 'Unknown'}`;
                      icon = <CreditCard size={16} />;
                      colorClass = 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
                      break;
                    case 'debt':
                      details = `Utang baru • ${debt?.name || 'Unknown Debt'} • ${account?.name || 'Unknown'}`;
                      icon = <AlertTriangle size={16} />;
                      colorClass = 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400';
                      break;
                    case 'repayment':
                      details = `Bayar utang • ${debt?.name || 'Unknown Debt'} • ${account?.name || 'Unknown'}`;
                      icon = <CheckCircle size={16} />;
                      colorClass = 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
                      break;
                    case 'saving':
                      details = `Tabungan • ${account?.name || 'Unknown'} • ${category?.name || 'Saving'}`;
                      icon = <TrendingUp size={16} />;
                      colorClass = 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400';
                      break;
                    default:
                      details = `${account?.name || 'Unknown'} • ${category?.name || 'Uncategorized'}`;
                  }
                  
                  return { details, icon, colorClass };
                };
                
                const { details, icon, colorClass } = getTransactionDetails(transaction);
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                        {icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString('id-ID')} • {details}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold text-sm ${
                      transaction.type === 'income' || transaction.type === 'debt' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {(transaction.type === 'income' || transaction.type === 'debt') ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                );
              })}

              {(!(dashboardData as any)?.recentTransactions || (dashboardData as any).recentTransactions.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p>Belum ada transaksi</p>
                  <p className="text-sm">Mulai dengan menambah transaksi pertama</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-16 flex-col gap-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm">Tambah Transaksi</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2">
            <Target className="h-5 w-5" />
            <span className="text-sm">Buat Goal</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2">
            <PieChart className="h-5 w-5" />
            <span className="text-sm">Atur Budget</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Lihat Laporan</span>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}