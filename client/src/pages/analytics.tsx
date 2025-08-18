import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, TrendingUp, TrendingDown, PieChart, BarChart3, AlertTriangle, CheckCircle2, Target, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { PageContainer } from '@/components/ui/page-container';

interface AnalyticsProps {
  workspaceId: number | undefined;
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function Analytics({ workspaceId }: AnalyticsProps) {
  const [timeframe, setTimeframe] = useState('6months');

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a workspace to view analytics</p>
        </div>
      </PageContainer>
    );
  }

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/analytics`, timeframe],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspaces/${workspaceId}/analytics?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    enabled: !!workspaceId,
  });

  // Fetch financial health data
  const { data: healthData } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/financial-health`],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/workspaces/${workspaceId}/financial-health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch financial health');
      }
      return response.json();
    },
    enabled: !!workspaceId,
  });

  const generateMockData = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 6),
      end: new Date()
    });

    const spendingTrends = months.map(month => ({
      month: format(month, 'MMM'),
      income: Math.floor(Math.random() * 5000000) + 3000000,
      expenses: Math.floor(Math.random() * 4000000) + 2000000,
      savings: Math.floor(Math.random() * 1500000) + 500000,
    }));

    const categoryData = [
      { name: 'Food & Dining', value: 1200000, percentage: 30 },
      { name: 'Transportation', value: 800000, percentage: 20 },
      { name: 'Shopping', value: 600000, percentage: 15 },
      { name: 'Bills & Utilities', value: 500000, percentage: 12.5 },
      { name: 'Entertainment', value: 400000, percentage: 10 },
      { name: 'Others', value: 500000, percentage: 12.5 },
    ];

    const cashFlowForecast = months.slice(-3).concat(
      eachMonthOfInterval({
        start: new Date(),
        end: subMonths(new Date(), -3)
      })
    ).map((month, index) => ({
      month: format(month, 'MMM'),
      projected: Math.floor(Math.random() * 2000000) + 1000000,
      actual: index < 6 ? Math.floor(Math.random() * 1800000) + 1200000 : null,
    }));

    const budgetComparison = [
      { category: 'Food', budgeted: 1500000, actual: 1200000, variance: -300000 },
      { category: 'Transport', budgeted: 800000, actual: 950000, variance: 150000 },
      { category: 'Shopping', budgeted: 600000, actual: 750000, variance: 150000 },
      { category: 'Bills', budgeted: 500000, actual: 480000, variance: -20000 },
      { category: 'Entertainment', budgeted: 400000, actual: 600000, variance: 200000 },
    ];

    return { spendingTrends, categoryData, cashFlowForecast, budgetComparison };
  };

  const mockData = generateMockData();
  const data = analytics || mockData;

  const financialHealth = healthData || {
    score: 75,
    debtToIncomeRatio: 0.3,
    savingsRate: 0.15,
    budgetCompliance: 0.82,
    trends: {
      score: 'improving',
      debtRatio: 'stable',
      savings: 'improving'
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="grid gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-gray-100 rounded"></CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with Time Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Financial Analytics</h1>
            <p className="text-gray-600 text-sm sm:text-base">Comprehensive insights into your financial health</p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Financial Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Financial Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${financialHealth.score >= 70 ? 'text-green-600' : financialHealth.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {financialHealth.score}
                </div>
                <p className="text-sm text-gray-600">Overall Score</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Debt-to-Income</span>
                  <Badge variant={financialHealth.debtToIncomeRatio < 0.3 ? 'default' : 'destructive'}>
                    {(financialHealth.debtToIncomeRatio * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${financialHealth.debtToIncomeRatio < 0.3 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(financialHealth.debtToIncomeRatio * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Savings Rate</span>
                  <Badge variant={financialHealth.savingsRate > 0.1 ? 'default' : 'secondary'}>
                    {(financialHealth.savingsRate * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(financialHealth.savingsRate * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Budget Compliance</span>
                  <Badge variant={financialHealth.budgetCompliance > 0.8 ? 'default' : 'secondary'}>
                    {(financialHealth.budgetCompliance * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${financialHealth.budgetCompliance * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Different Analytics */}
        <Tabs defaultValue="spending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="spending" className="text-[10px] sm:text-sm px-2 py-1">
              <span className="hidden sm:inline">Spending Trends</span>
              <span className="sm:hidden">Spending</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-[10px] sm:text-sm px-2 py-1">
              <span className="hidden sm:inline">Categories</span>
              <span className="sm:hidden">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-[10px] sm:text-sm px-2 py-1">
              <span className="hidden sm:inline">Cash Flow</span>
              <span className="sm:hidden">Flow</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-[10px] sm:text-sm px-2 py-1">
              <span className="hidden sm:inline">Budget Analysis</span>
              <span className="sm:hidden">Budget</span>
            </TabsTrigger>
          </TabsList>

          {/* Spending Trends */}
          <TabsContent value="spending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Income vs Expenses Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']} />
                    <Bar dataKey="income" fill="#10B981" name="Income" />
                    <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                    <Bar dataKey="savings" fill="#3B82F6" name="Savings" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Analysis */}
          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Expense by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={data.categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {data.categoryData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.categoryData.map((category: any, index: number) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">Rp {category.value.toLocaleString('id-ID')}</div>
                          <div className="text-sm text-gray-600">{category.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cash Flow Forecast */}
          <TabsContent value="forecast" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cash Flow Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.cashFlowForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']} />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      name="Actual" 
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projected" 
                      stroke="#3B82F6" 
                      strokeDasharray="5 5" 
                      strokeWidth={2} 
                      name="Projected" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budget Analysis */}
          <TabsContent value="budget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Budget vs Actual Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.budgetComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']} />
                    <Bar dataKey="budgeted" fill="#94A3B8" name="Budgeted" />
                    <Bar dataKey="actual" fill="#0EA5E9" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.budgetComparison.map((item: any) => (
                    <div key={item.category} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium">{item.category}</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Budgeted:</span>
                          <span>Rp {item.budgeted.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Actual:</span>
                          <span>Rp {item.actual.toLocaleString('id-ID')}</span>
                        </div>
                        <div className={`flex justify-between text-sm font-medium ${item.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span>Variance:</span>
                          <span>
                            {item.variance > 0 ? '+' : ''}Rp {item.variance.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}