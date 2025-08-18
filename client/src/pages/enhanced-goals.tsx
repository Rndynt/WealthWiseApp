import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Lightbulb, 
  Award, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  PlusCircle,
  Star,
  Zap,
  Brain,
  BarChart3,
  Trophy,
  Eye,
  Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Enhanced Goal form schema
const enhancedGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['savings', 'debt_payment', 'investment', 'emergency_fund', 'vacation', 'house', 'education', 'retirement']),
  targetAmount: z.string().min(1, 'Target amount is required'),
  currentAmount: z.string().default('0'),
  targetDate: z.string().min(1, 'Target date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  isAutoTracking: z.boolean().default(false),
  linkedAccountId: z.number().optional(),
  linkedDebtId: z.number().optional(),
  createMilestones: z.boolean().default(true),
});

type EnhancedGoalForm = z.infer<typeof enhancedGoalSchema>;

interface EnhancedGoalsPageProps {
  workspaceId?: number;
}

export default function EnhancedGoalsPage({ workspaceId: propWorkspaceId }: EnhancedGoalsPageProps) {
  const workspaceId = propWorkspaceId || 0;
  const queryClient = useQueryClient();
  
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch goals data
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'goals'],
    enabled: !!workspaceId,
  });

  // Fetch goal metrics
  const { data: metrics } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'goals', 'metrics'],
    enabled: !!workspaceId,
  });

  // Fetch goal suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'goals', 'suggestions'],
    enabled: !!workspaceId,
  });

  // Fetch insights
  const { data: insights = [] } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'goals', 'insights'],
    enabled: !!workspaceId,
  });

  // Fetch accounts and debts for linking
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'accounts'],
    enabled: !!workspaceId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['/api/workspaces', workspaceId, 'debts'],
    enabled: !!workspaceId,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (data: EnhancedGoalForm) => 
      apiRequest(`/api/workspaces/${workspaceId}/goals`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals', 'metrics'] });
      setShowCreateDialog(false);
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: Partial<EnhancedGoalForm> }) =>
      apiRequest(`/api/workspaces/${workspaceId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals', 'metrics'] });
    },
  });

  // Create goal from suggestion
  const createFromSuggestionMutation = useMutation({
    mutationFn: (suggestion: any) =>
      apiRequest(`/api/workspaces/${workspaceId}/goals`, {
        method: 'POST',
        body: JSON.stringify({
          name: suggestion.title,
          description: suggestion.description,
          type: suggestion.type,
          targetAmount: suggestion.recommendedAmount.toString(),
          currentAmount: '0',
          targetDate: getDateFromTimeline(suggestion.timeline),
          priority: suggestion.priority,
          isAutoTracking: true,
          createMilestones: true,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals', 'suggestions'] });
    },
  });

  // Mark insight as read
  const markInsightReadMutation = useMutation({
    mutationFn: (insightId: number) =>
      apiRequest(`/api/workspaces/${workspaceId}/goals/insights/${insightId}/read`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces', workspaceId, 'goals', 'insights'] });
    },
  });

  const form = useForm<EnhancedGoalForm>({
    resolver: zodResolver(enhancedGoalSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'savings',
      targetAmount: '',
      currentAmount: '0',
      targetDate: '',
      priority: 'medium',
      isAutoTracking: false,
      createMilestones: true,
    },
  });

  const onSubmit = (data: EnhancedGoalForm) => {
    createGoalMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGoalTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      savings: DollarSign,
      debt_payment: TrendingUp,
      investment: BarChart3,
      emergency_fund: AlertTriangle,
      vacation: Star,
      house: Target,
      education: Brain,
      retirement: Trophy,
    };
    const Icon = icons[type] || Target;
    return <Icon className="w-4 h-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  const getDateFromTimeline = (timeline: string): string => {
    const today = new Date();
    if (timeline.includes('month')) {
      const months = parseInt(timeline.match(/\d+/)?.[0] || '12');
      today.setMonth(today.getMonth() + months);
    } else if (timeline.includes('year')) {
      const years = parseInt(timeline.match(/\d+/)?.[0] || '1');
      today.setFullYear(today.getFullYear() + years);
    }
    return today.toISOString().split('T')[0];
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (goalsLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Enhanced Goals
          </h1>
          <p className="text-gray-600 text-sm">
            AI-powered goal management with smart insights and automation
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-goal">
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Enhanced Goal</DialogTitle>
              <DialogDescription>
                Set up a smart goal with AI-powered insights and automation
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-goal-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-goal-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="debt_payment">Debt Payment</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                            <SelectItem value="vacation">Vacation</SelectItem>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="retirement">Retirement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-goal-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-target-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-target-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-goal-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linked Account (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <FormControl>
                            <SelectTrigger data-testid="select-linked-account">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {accounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <FormField
                    control={form.control}
                    name="isAutoTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="switch-auto-tracking"
                          />
                        </FormControl>
                        <FormLabel>Enable Auto-Tracking</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="createMilestones"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="switch-create-milestones"
                          />
                        </FormControl>
                        <FormLabel>Auto-Create Milestones</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGoalMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Goals</p>
                  <p className="text-2xl font-bold" data-testid="metric-total-goals">
                    {metrics?.totalGoals || 0}
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Goals</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="metric-active-goals">
                    {metrics?.activeGoals || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="metric-completed-goals">
                    {metrics?.completedGoals || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Progress</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="metric-avg-progress">
                    {(metrics?.averageProgress || 0).toFixed(0)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">AI Suggestions</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal: any) => {
              const currentAmount = parseFloat(goal.currentAmount) || 0;
              const targetAmount = parseFloat(goal.targetAmount) || 1; // Avoid division by zero
              const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
              return (
                <Card key={goal.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedGoal(goal)} data-testid={`card-goal-${goal.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getGoalTypeIcon(goal.type)}
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                      </div>
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                    </div>
                    {goal.description && (
                      <CardDescription className="text-sm">
                        {goal.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{(progress || 0).toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatCurrency(currentAmount)}</span>
                        <span>{formatCurrency(targetAmount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                      {goal.isAutoTracking && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Zap className="w-3 h-3" />
                          <span>Auto</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI-Powered Goal Suggestions
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your financial data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.map((suggestion: any, index: number) => (
                  <Card key={index} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getGoalTypeIcon(suggestion.type)}
                            <h3 className="font-semibold">{suggestion.title}</h3>
                            <Badge className={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{suggestion.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Amount: </span>
                              {formatCurrency(suggestion.recommendedAmount)}
                            </div>
                            <div>
                              <span className="font-medium">Timeline: </span>
                              {suggestion.timeline}
                            </div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-blue-800">
                              <strong>AI Reasoning:</strong> {suggestion.reasoning}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-blue-600">
                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => createFromSuggestionMutation.mutate(suggestion)}
                          disabled={createFromSuggestionMutation.isPending}
                          data-testid={`button-create-suggestion-${index}`}
                        >
                          <PlusCircle className="w-4 h-4 mr-1" />
                          Create Goal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {suggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No suggestions available at the moment.</p>
                    <p className="text-sm">Add more financial data to get personalized recommendations.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Goal Insights & Recommendations
              </CardTitle>
              <CardDescription>
                AI-generated insights to help you achieve your goals faster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {insights.map((insight: any) => (
                    <Card key={insight.id} className={`border-l-4 ${
                      insight.severity === 'warning' ? 'border-l-orange-500' :
                      insight.severity === 'error' ? 'border-l-red-500' :
                      'border-l-blue-500'
                    }`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {insight.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                              {insight.severity === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              {insight.severity === 'info' && <Lightbulb className="w-4 h-4 text-blue-500" />}
                              <h4 className="font-medium text-sm">{insight.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {insight.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{insight.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!insight.isRead && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => markInsightReadMutation.mutate(insight.id)}
                              data-testid={`button-mark-read-${insight.id}`}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {insights.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No insights available yet.</p>
                      <p className="text-sm">Insights will appear as your goals progress.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goals by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.goalsByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getGoalTypeIcon(type)}
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Goals by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.goalsByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <span className="capitalize">{priority}</span>
                        <Badge className={getPriorityColor(priority)}>{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Target</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(metrics?.totalTargetAmount || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Saved</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(metrics?.totalCurrentAmount || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Remaining</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency((metrics?.totalTargetAmount || 0) - (metrics?.totalCurrentAmount || 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Overall Progress</p>
                      <p className="text-lg font-bold text-purple-600">
                        {(metrics?.totalCurrentAmount && metrics?.totalTargetAmount && metrics.totalTargetAmount > 0 
                          ? ((metrics.totalCurrentAmount / metrics.totalTargetAmount) * 100).toFixed(1) 
                          : '0.0')}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getGoalTypeIcon(selectedGoal.type)}
                {selectedGoal.name}
                <Badge className={getPriorityColor(selectedGoal.priority)}>
                  {selectedGoal.priority}
                </Badge>
              </DialogTitle>
              <DialogDescription>{selectedGoal.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Progress Section */}
              <div className="space-y-3">
                <h3 className="font-semibold">Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current Progress</span>
                    <span className="font-medium">
                      {(() => {
                        const current = parseFloat(selectedGoal.currentAmount) || 0;
                        const target = parseFloat(selectedGoal.targetAmount) || 1;
                        const progress = target > 0 ? (current / target) * 100 : 0;
                        return (progress || 0).toFixed(1);
                      })()}%
                    </span>
                  </div>
                  <Progress 
                    value={(() => {
                      const current = parseFloat(selectedGoal.currentAmount) || 0;
                      const target = parseFloat(selectedGoal.targetAmount) || 1;
                      return target > 0 ? (current / target) * 100 : 0;
                    })()} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatCurrency(parseFloat(selectedGoal.currentAmount) || 0)}</span>
                    <span>{formatCurrency(parseFloat(selectedGoal.targetAmount) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Target Date</h4>
                  <p>{new Date(selectedGoal.targetDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Status</h4>
                  <p className="capitalize">{selectedGoal.status}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Auto-Tracking</h4>
                  <p>{selectedGoal.isAutoTracking ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Created</h4>
                  <p>{new Date(selectedGoal.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}