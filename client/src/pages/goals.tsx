import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, TrendingUp, Calendar, DollarSign, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { PageContainer, CardContainer } from '@/components/ui/page-container';
import { notificationService } from '@/lib/notification-service';
import { format, differenceInDays, isAfter } from 'date-fns';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  type: z.enum(['savings', 'debt_payment', 'investment', 'emergency_fund', 'retirement']),
  targetAmount: z.string().min(1, 'Target amount is required'),
  currentAmount: z.string().default('0'),
  targetDate: z.string().min(1, 'Target date is required'),
  priority: z.enum(['low', 'medium', 'high']),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface Goal {
  id: number;
  name: string;
  description?: string;
  type: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  priority: string;
  status: 'active' | 'completed' | 'paused';
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
}

interface GoalsProps {
  workspaceId: number | undefined;
}

export default function Goals({ workspaceId }: GoalsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
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
    },
  });

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: [`/api/workspaces/${workspaceId}/goals`],
    enabled: !!workspaceId,
  });

  const createGoalMutation = useMutation({
    mutationFn: (data: GoalFormData) => 
      apiRequest('POST', `/api/workspaces/${workspaceId}/goals`, {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount).toString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/goals`] });
      setIsDialogOpen(false);
      form.reset();
      notificationService.success('Goal Created', 'Your financial goal has been created successfully!');
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
      notificationService.success('Goal Deleted', 'Goal has been removed successfully!');
    },
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getProgressPercentage = (current: string, target: string) => {
    const currentNum = parseFloat(current);
    const targetNum = parseFloat(target);
    return Math.min((currentNum / targetNum) * 100, 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings': return '💰';
      case 'debt_payment': return '💳';
      case 'investment': return '📈';
      case 'emergency_fund': return '🚨';
      case 'retirement': return '🏖️';
      default: return '🎯';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    return differenceInDays(target, today);
  };

  const handleSubmit = (data: GoalFormData) => {
    if (editingGoal) {
      updateGoalMutation.mutate({ goalId: editingGoal.id, data });
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    form.reset({
      name: goal.name,
      description: goal.description || '',
      type: goal.type as any,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate.split('T')[0],
      priority: goal.priority as any,
    });
    setIsDialogOpen(true);
  };

  const handleAddProgress = (goal: Goal, amount: string) => {
    const newCurrentAmount = (parseFloat(goal.currentAmount) + parseFloat(amount)).toString();
    updateGoalMutation.mutate({
      goalId: goal.id,
      data: { currentAmount: newCurrentAmount }
    });
  };

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Please select a workspace to view goals</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Goals</h1>
            <p className="text-gray-600 dark:text-gray-400">Track and achieve your financial objectives</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingGoal(null); form.reset(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Goal Name</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Emergency Fund"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="type">Goal Type</Label>
                  <Select onValueChange={(value) => form.setValue('type', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">💰 Savings</SelectItem>
                      <SelectItem value="debt_payment">💳 Debt Payment</SelectItem>
                      <SelectItem value="investment">📈 Investment</SelectItem>
                      <SelectItem value="emergency_fund">🚨 Emergency Fund</SelectItem>
                      <SelectItem value="retirement">🏖️ Retirement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      {...form.register('targetAmount')}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      {...form.register('currentAmount')}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetDate">Target Date</Label>
                    <Input
                      id="targetDate"
                      type="date"
                      {...form.register('targetDate')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select onValueChange={(value) => form.setValue('priority', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Additional details about this goal..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" disabled={createGoalMutation.isPending || updateGoalMutation.isPending}>
                    {editingGoal ? 'Update' : 'Create'} Goal
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals Overview */}
        {goals && goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Goals</p>
                    <p className="text-2xl font-bold">{goals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">
                      {goals.filter(g => g.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold">
                      {goals.filter(g => g.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Target</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(goals.reduce((sum, goal) => sum + parseFloat(goal.targetAmount), 0).toString())}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading goals...</p>
            </div>
          ) : goals && goals.length > 0 ? (
            goals.map((goal) => {
              const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
              const daysRemaining = getDaysRemaining(goal.targetDate);
              const isOverdue = daysRemaining < 0;

              return (
                <Card key={goal.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getTypeIcon(goal.type)}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{goal.name}</h3>
                          {goal.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{goal.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(goal.priority) as any}>
                          {goal.priority}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-gray-600">Current: </span>
                          <span className="font-semibold">{formatCurrency(goal.currentAmount)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Target: </span>
                          <span className="font-semibold">{formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Target: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}</span>
                        </div>
                        <span className={`font-medium ${isOverdue ? 'text-red-500' : daysRemaining <= 30 ? 'text-orange-500' : 'text-green-500'}`}>
                          {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                        </span>
                      </div>

                      {goal.status === 'active' && progress < 100 && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const amount = prompt('Enter amount to add to this goal:');
                              if (amount && !isNaN(parseFloat(amount))) {
                                handleAddProgress(goal, amount);
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Progress
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No goals yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start tracking your financial objectives by creating your first goal.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}