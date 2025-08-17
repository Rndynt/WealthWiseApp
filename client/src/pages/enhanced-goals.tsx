import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Target, TrendingUp, Calendar, DollarSign, Plus, Edit, Trash2, CheckCircle, 
  AlertTriangle, Lightbulb, Award, BarChart3, PieChart, Zap, Brain, Star,
  Sparkles, Timer, Users, ArrowRight, TrendingDown, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { PageContainer, CardContainer } from '@/components/ui/page-container';
import { notificationService } from '@/lib/notification-service';
import { format, differenceInDays, isAfter, isPast } from 'date-fns';

// Enhanced Goal Schema
const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  type: z.enum(['savings', 'debt_payment', 'investment', 'emergency_fund', 'retirement', 'vacation', 'house', 'education']),
  subType: z.string().optional(),
  targetAmount: z.string().min(1, 'Target amount is required'),
  currentAmount: z.string().default('0'),
  targetDate: z.string().min(1, 'Target date is required'),
  linkedAccountId: z.string().optional(),
  linkedDebtId: z.string().optional(),
  isAutoTracking: z.boolean().default(true),
  autoContributeAmount: z.string().optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  tags: z.array(z.string()).optional(),
  createMilestones: z.boolean().default(true),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface EnhancedGoal {
  id: number;
  name: string;
  description?: string;
  type: string;
  subType?: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  linkedAccountId?: number;
  linkedDebtId?: number;
  linkedAccount?: any;
  linkedDebt?: any;
  isAutoTracking: boolean;
  autoContributeAmount?: string;
  riskTolerance?: string;
  milestones?: any[];
  lastProgressUpdate?: string;
  projectedCompletionDate?: string;
  completedAt?: string;
  priority: string;
  status: string;
  aiInsights?: any;
  performanceMetrics?: any;
  tags?: string[];
  contributions?: any[];
  insights?: any[];
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
}

interface GoalSuggestion {
  type: string;
  title: string;
  description: string;
  recommendedAmount: number;
  priority: string;
  reasoning: string;
  confidence: number;
}

interface GoalMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  averageProgress: number;
  goalsByType: Record<string, number>;
  goalsByPriority: Record<string, number>;
}

interface GoalsProps {
  workspaceId: number | undefined;
}

export default function EnhancedGoals({ workspaceId }: GoalsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<EnhancedGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<EnhancedGoal | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'savings',
      targetAmount: '',
      currentAmount: '0',
      targetDate: '',
      priority: 'medium',
      isAutoTracking: true,
      createMilestones: true,
      tags: [],
    },
  });

  // Queries
  const { data: goals = [], isLoading: goalsLoading } = useQuery<EnhancedGoal[]>({
    queryKey: [`/api/workspaces/${workspaceId}/goals`],
    enabled: !!workspaceId,
  });

  const { data: goalMetrics } = useQuery<GoalMetrics>({
    queryKey: [`/api/workspaces/${workspaceId}/goals/metrics`],
    enabled: !!workspaceId,
  });

  const { data: goalSuggestions = [] } = useQuery<GoalSuggestion[]>({
    queryKey: [`/api/workspaces/${workspaceId}/goals/suggestions`],
    enabled: !!workspaceId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  const { data: goalInsights = [] } = useQuery({
    queryKey: [`/api/workspaces/${workspaceId}/goals/insights`],
    enabled: !!workspaceId,
  });

  // Mutations
  const createGoalMutation = useMutation({
    mutationFn: (data: GoalFormData) => 
      apiRequest('POST', `/api/workspaces/${workspaceId}/goals`, {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount).toString(),
        linkedAccountId: data.linkedAccountId ? parseInt(data.linkedAccountId) : undefined,
        linkedDebtId: data.linkedDebtId ? parseInt(data.linkedDebtId) : undefined,
        autoContributeAmount: data.autoContributeAmount ? parseFloat(data.autoContributeAmount).toString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals/metrics`] });
      setIsDialogOpen(false);
      form.reset();
      notificationService.success('Goal Created', 'Your financial goal has been created with AI-powered insights!');
    },
    onError: (error: any) => {
      notificationService.error('Error', error.message || 'Failed to create goal');
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: Partial<GoalFormData> }) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/goals/${goalId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals`] });
      setEditingGoal(null);
      setIsDialogOpen(false);
      form.reset();
      notificationService.success('Goal Updated', 'Your goal has been updated successfully!');
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals/metrics`] });
      notificationService.success('Goal Deleted', 'Goal has been removed successfully!');
    },
  });

  const generateMilestonesMutation = useMutation({
    mutationFn: (goalId: number) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/goals/${goalId}/milestones/generate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals`] });
      notificationService.success('Milestones Generated', 'AI has created intelligent milestones for your goal!');
    },
  });

  // Helper functions
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getProgressPercentage = (current: string, target: string) => {
    const currentNum = parseFloat(current);
    const targetNum = parseFloat(target);
    return targetNum > 0 ? Math.min(100, (currentNum / targetNum) * 100) : 0;
  };

  const getDaysRemaining = (targetDate: string) => {
    return differenceInDays(new Date(targetDate), new Date());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return Target;
      case 'debt_payment': return TrendingDown;
      case 'investment': return TrendingUp;
      case 'emergency_fund': return AlertTriangle;
      case 'retirement': return Timer;
      case 'vacation': return Star;
      case 'house': return Users;
      case 'education': return Brain;
      default: return Target;
    }
  };

  const openEditDialog = (goal: EnhancedGoal) => {
    setEditingGoal(goal);
    form.reset({
      name: goal.name,
      description: goal.description || '',
      type: goal.type as any,
      subType: goal.subType || '',
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      linkedAccountId: goal.linkedAccountId?.toString(),
      linkedDebtId: goal.linkedDebtId?.toString(),
      isAutoTracking: goal.isAutoTracking,
      autoContributeAmount: goal.autoContributeAmount || '',
      riskTolerance: goal.riskTolerance as any,
      priority: goal.priority as any,
      tags: goal.tags || [],
      createMilestones: false,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: GoalFormData) => {
    if (editingGoal) {
      updateGoalMutation.mutate({ goalId: editingGoal.id, data });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const handleSuggestionAccept = (suggestion: GoalSuggestion) => {
    form.reset({
      name: suggestion.title,
      description: suggestion.description,
      type: suggestion.type as any,
      targetAmount: suggestion.recommendedAmount.toString(),
      priority: suggestion.priority as any,
      createMilestones: true,
      isAutoTracking: true,
    });
    setIsDialogOpen(true);
  };

  if (goalsLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header with Metrics */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Smart Goals</h1>
            <Badge variant="secondary" className="ml-2">
              <Brain className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>

        {/* Goals Overview Cards */}
        {goalMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Goals</p>
                  <p className="text-2xl font-bold">{goalMetrics.totalGoals}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{goalMetrics.activeGoals}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{goalMetrics.completedGoals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Progress</p>
                  <p className="text-2xl font-bold text-purple-600">{goalMetrics.averageProgress.toFixed(1)}%</p>
                </div>
                <PieChart className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>
        )}

        {/* AI Suggestions */}
        {goalSuggestions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {goalSuggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900">{suggestion.title}</h4>
                      <p className="text-sm text-blue-700 mb-2">{suggestion.description}</p>
                      <div className="flex items-center gap-4 text-xs text-blue-600">
                        <span>Amount: {formatCurrency(suggestion.recommendedAmount)}</span>
                        <Badge variant="outline" size="sm" className={getPriorityColor(suggestion.priority)}>
                          {suggestion.priority}
                        </Badge>
                        <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleSuggestionAccept(suggestion)} className="ml-4">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">
            AI Insights
            {goalInsights.filter((i: any) => !i.isRead).length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {goalInsights.filter((i: any) => !i.isRead).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Goals Grid */}
          <CardContainer>
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
                <p className="text-gray-500 mb-4">Create your first financial goal and let AI help you achieve it!</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Goal
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:gap-6">
                {goals.map((goal) => {
                  const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
                  const daysRemaining = getDaysRemaining(goal.targetDate);
                  const isOverdue = daysRemaining < 0;
                  const TypeIcon = getTypeIcon(goal.type);

                  return (
                    <Card 
                      key={goal.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        goal.status === 'completed' ? 'bg-green-50 border-green-200' : ''
                      } ${isOverdue && goal.status === 'active' ? 'bg-red-50 border-red-200' : ''}`}
                      onClick={() => setSelectedGoal(goal)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <TypeIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{goal.name}</h3>
                              {goal.description && (
                                <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" size="sm">
                                  {goal.type.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  size="sm" 
                                  className={`${getPriorityColor(goal.priority)} text-white border-0`}
                                >
                                  {goal.priority}
                                </Badge>
                                {goal.isAutoTracking && (
                                  <Badge variant="outline" size="sm">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Auto
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(goal);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this goal?')) {
                                  deleteGoalMutation.mutate(goal.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        {/* Progress Section */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                            </span>
                            <span className={`${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                              {isOverdue ? `Overdue by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days left`}
                            </span>
                          </div>

                          {/* Linked Account/Debt */}
                          {(goal.linkedAccount || goal.linkedDebt) && (
                            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              <ArrowRight className="h-3 w-3" />
                              {goal.linkedAccount && `Linked to: ${goal.linkedAccount.name}`}
                              {goal.linkedDebt && `Paying off: ${goal.linkedDebt.name}`}
                            </div>
                          )}

                          {/* Milestones Preview */}
                          {goal.milestones && goal.milestones.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Award className="h-3 w-3" />
                              <span>{goal.milestones.filter((m: any) => m.isCompleted).length} of {goal.milestones.length} milestones completed</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContainer>
        </TabsContent>

        <TabsContent value="insights">
          <CardContainer>
            {goalInsights.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h3>
                <p className="text-gray-500">AI insights will appear here as you progress towards your goals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goalInsights.map((insight: any) => (
                  <Card key={insight.id} className={`${!insight.isRead ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            insight.severity === 'success' ? 'bg-green-100' :
                            insight.severity === 'warning' ? 'bg-yellow-100' :
                            insight.severity === 'error' ? 'bg-red-100' :
                            'bg-blue-100'
                          }`}>
                            {insight.type === 'achievement' ? <Award className="h-5 w-5 text-green-600" /> :
                             insight.type === 'alert' ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> :
                             insight.type === 'recommendation' ? <Lightbulb className="h-5 w-5 text-blue-600" /> :
                             <Brain className="h-5 w-5 text-purple-600" />}
                          </div>
                          <div>
                            <h3 className="font-semibold">{insight.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {format(new Date(insight.createdAt), 'MMM dd, yyyy • HH:mm')}
                            </p>
                          </div>
                        </div>
                        {!insight.isRead && (
                          <Badge variant="secondary" size="sm">New</Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContainer>
        </TabsContent>

        <TabsContent value="analytics">
          <CardContainer>
            {goalMetrics ? (
              <div className="grid gap-6">
                {/* Goals by Type Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Goals by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(goalMetrics.goalsByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="capitalize">{type.replace('_', ' ')}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Goals by Priority */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Goals by Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(goalMetrics.goalsByPriority).map(([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority)}`}></div>
                            <span className="capitalize">{priority}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financial Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600">Total Target</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(goalMetrics.totalTargetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Progress</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(goalMetrics.totalCurrentAmount)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data</h3>
                <p className="text-gray-500">Create some goals to see analytics</p>
              </div>
            )}
          </CardContainer>
        </TabsContent>
      </Tabs>

      {/* Goal Creation/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {editingGoal ? 'Edit Goal' : 'Create New Goal'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Goal Name *</Label>
                <Input {...form.register('name')} placeholder="Enter goal name" />
              </div>
              <div>
                <Label htmlFor="type">Goal Type *</Label>
                <Select onValueChange={(value) => form.setValue('type', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="debt_payment">Debt Payment</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="house">House Purchase</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea {...form.register('description')} placeholder="Describe your goal" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetAmount">Target Amount *</Label>
                <Input 
                  {...form.register('targetAmount')} 
                  type="number" 
                  placeholder="0" 
                />
              </div>
              <div>
                <Label htmlFor="targetDate">Target Date *</Label>
                <Input 
                  {...form.register('targetDate')} 
                  type="date" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select onValueChange={(value) => form.setValue('priority', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="autoContributeAmount">Auto Contribution (Monthly)</Label>
                <Input 
                  {...form.register('autoContributeAmount')} 
                  type="number" 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedAccountId">Linked Account</Label>
                <Select onValueChange={(value) => form.setValue('linkedAccountId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="linkedDebtId">Linked Debt</Label>
                <Select onValueChange={(value) => form.setValue('linkedDebtId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select debt (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {debts.map((debt: any) => (
                      <SelectItem key={debt.id} value={debt.id.toString()}>
                        {debt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isAutoTracking"
                  checked={form.watch('isAutoTracking')}
                  onCheckedChange={(checked) => form.setValue('isAutoTracking', checked)}
                />
                <Label htmlFor="isAutoTracking" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto-track progress from transactions
                </Label>
              </div>

              {!editingGoal && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="createMilestones"
                    checked={form.watch('createMilestones')}
                    onCheckedChange={(checked) => form.setValue('createMilestones', checked)}
                  />
                  <Label htmlFor="createMilestones" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Create AI-powered milestones
                  </Label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                className="flex items-center gap-2"
              >
                {createGoalMutation.isPending || updateGoalMutation.isPending ? (
                  'Saving...'
                ) : (
                  <>
                    {editingGoal ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingGoal ? 'Update Goal' : 'Create Goal'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}