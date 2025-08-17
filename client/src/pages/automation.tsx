import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Bot, Calendar, ArrowRight, Edit, Trash2, ToggleLeft, ToggleRight, Zap, Tag, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { format } from 'date-fns';

const recurringTransactionSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.string().min(1, 'Amount is required'),
  categoryId: z.number().min(1, 'Category is required'),
  accountId: z.number().min(1, 'Account is required'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

const categoryRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  pattern: z.string().min(1, 'Pattern is required'),
  categoryId: z.number().min(1, 'Category is required'),
  isActive: z.boolean().default(true),
});

type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
type CategoryRuleFormData = z.infer<typeof categoryRuleSchema>;

interface RecurringTransaction {
  id: number;
  name: string;
  description?: string;
  type: string;
  amount: string;
  categoryId: number;
  accountId: number;
  frequency: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  workspaceId: number;
  createdAt: string;
  lastExecuted?: string;
  nextExecution: string;
}

interface CategoryRule {
  id: number;
  name: string;
  pattern: string;
  categoryId: number;
  isActive: boolean;
  workspaceId: number;
  timesUsed: number;
  createdAt: string;
}

interface AutomationProps {
  workspaceId: number | undefined;
}

export default function Automation({ workspaceId }: AutomationProps) {
  const [activeTab, setActiveTab] = useState('recurring');
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const queryClient = useQueryClient();

  const recurringForm = useForm<RecurringTransactionFormData>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'expense',
      amount: '',
      categoryId: 0,
      accountId: 0,
      frequency: 'monthly',
      startDate: '',
      endDate: '',
      isActive: true,
    },
  });

  const ruleForm = useForm<CategoryRuleFormData>({
    resolver: zodResolver(categoryRuleSchema),
    defaultValues: {
      name: '',
      pattern: '',
      categoryId: 0,
      isActive: true,
    },
  });

  // Fetch data
  const { data: recurringTransactions, isLoading: loadingRecurring } = useQuery<RecurringTransaction[]>({
    queryKey: [`/api/workspaces/${workspaceId}/recurring-transactions`],
    enabled: !!workspaceId,
  });

  const { data: categoryRules, isLoading: loadingRules } = useQuery<CategoryRule[]>({
    queryKey: [`/api/workspaces/${workspaceId}/category-rules`],
    enabled: !!workspaceId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const { data: accounts } = useQuery<any[]>({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  // Mutations for recurring transactions
  const createRecurringMutation = useMutation({
    mutationFn: (data: RecurringTransactionFormData) => 
      apiRequest('POST', `/api/workspaces/${workspaceId}/recurring-transactions`, {
        ...data,
        amount: parseFloat(data.amount).toString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/recurring-transactions`] });
      setIsRecurringDialogOpen(false);
      recurringForm.reset();
      notificationService.success('Template Created', 'Recurring transaction template created successfully!');
    },
  });

  const updateRecurringMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecurringTransactionFormData> }) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/recurring-transactions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/recurring-transactions`] });
      setEditingRecurring(null);
      setIsRecurringDialogOpen(false);
      recurringForm.reset();
      notificationService.success('Template Updated', 'Recurring transaction updated successfully!');
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/recurring-transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/recurring-transactions`] });
      notificationService.success('Template Deleted', 'Recurring transaction template removed successfully!');
    },
  });

  // Mutations for category rules
  const createRuleMutation = useMutation({
    mutationFn: (data: CategoryRuleFormData) => 
      apiRequest('POST', `/api/workspaces/${workspaceId}/category-rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/category-rules`] });
      setIsRuleDialogOpen(false);
      ruleForm.reset();
      notificationService.success('Rule Created', 'Auto-categorization rule created successfully!');
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoryRuleFormData> }) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/category-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/category-rules`] });
      setEditingRule(null);
      setIsRuleDialogOpen(false);
      ruleForm.reset();
      notificationService.success('Rule Updated', 'Auto-categorization rule updated successfully!');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/category-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/category-rules`] });
      notificationService.success('Rule Deleted', 'Auto-categorization rule removed successfully!');
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

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'monthly': return '🗓️';
      case 'yearly': return '📊';
      default: return '🔄';
    }
  };

  const handleRecurringSubmit = (data: RecurringTransactionFormData) => {
    if (editingRecurring) {
      updateRecurringMutation.mutate({ id: editingRecurring.id, data });
    } else {
      createRecurringMutation.mutate(data);
    }
  };

  const handleRuleSubmit = (data: CategoryRuleFormData) => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const toggleRecurringStatus = (transaction: RecurringTransaction) => {
    updateRecurringMutation.mutate({
      id: transaction.id,
      data: { isActive: !transaction.isActive }
    });
  };

  const toggleRuleStatus = (rule: CategoryRule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { isActive: !rule.isActive }
    });
  };

  if (!workspaceId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">Please select a workspace to view automation</p>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automation</h1>
            <p className="text-gray-600 dark:text-gray-400">Automate your financial workflows</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Repeat className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Recurring Templates</p>
                  <p className="text-2xl font-bold">{recurringTransactions?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Category Rules</p>
                  <p className="text-2xl font-bold">{categoryRules?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Active Automations</p>
                  <p className="text-2xl font-bold">
                    {(recurringTransactions?.filter(r => r.isActive).length || 0) + 
                     (categoryRules?.filter(r => r.isActive).length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="recurring">Recurring Transactions</TabsTrigger>
            <TabsTrigger value="categorization">Auto-Categorization</TabsTrigger>
          </TabsList>

          {/* Recurring Transactions Tab */}
          <TabsContent value="recurring" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recurring Transaction Templates</h2>
              <Dialog open={isRecurringDialogOpen} onOpenChange={setIsRecurringDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRecurring(null); recurringForm.reset(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingRecurring ? 'Edit Template' : 'Create Recurring Template'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={recurringForm.handleSubmit(handleRecurringSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        {...recurringForm.register('name')}
                        placeholder="e.g., Monthly Salary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select onValueChange={(value) => recurringForm.setValue('type', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          {...recurringForm.register('amount')}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="categoryId">Category</Label>
                        <Select onValueChange={(value) => recurringForm.setValue('categoryId', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="accountId">Account</Label>
                        <Select onValueChange={(value) => recurringForm.setValue('accountId', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select onValueChange={(value) => recurringForm.setValue('frequency', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          {...recurringForm.register('startDate')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date (Optional)</Label>
                        <Input
                          id="endDate"
                          type="date"
                          {...recurringForm.register('endDate')}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        {...recurringForm.register('description')}
                        placeholder="Additional details..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={recurringForm.watch('isActive')}
                        onCheckedChange={(checked) => recurringForm.setValue('isActive', checked)}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1" disabled={createRecurringMutation.isPending}>
                        {editingRecurring ? 'Update' : 'Create'} Template
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsRecurringDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {loadingRecurring ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading templates...</p>
                </div>
              ) : recurringTransactions && recurringTransactions.length > 0 ? (
                recurringTransactions.map((transaction) => (
                  <Card key={transaction.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{getFrequencyIcon(transaction.frequency)}</span>
                          <div>
                            <h3 className="font-semibold">{transaction.name}</h3>
                            <p className="text-sm text-gray-600">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                          <span className="font-semibold">{formatCurrency(transaction.amount)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRecurringStatus(transaction)}
                          >
                            {transaction.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecurring(transaction);
                              recurringForm.reset({
                                name: transaction.name,
                                description: transaction.description || '',
                                type: transaction.type as any,
                                amount: transaction.amount,
                                categoryId: transaction.categoryId,
                                accountId: transaction.accountId,
                                frequency: transaction.frequency as any,
                                startDate: transaction.startDate.split('T')[0],
                                endDate: transaction.endDate?.split('T')[0] || '',
                                isActive: transaction.isActive,
                              });
                              setIsRecurringDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRecurringMutation.mutate(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                        <span>Next: {format(new Date(transaction.nextExecution), 'MMM dd, yyyy')}</span>
                        <span>Frequency: {transaction.frequency}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Repeat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No recurring templates</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create templates for transactions that happen regularly.
                  </p>
                  <Button onClick={() => setIsRecurringDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Auto-Categorization Tab */}
          <TabsContent value="categorization" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Auto-Categorization Rules</h2>
              <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingRule(null); ruleForm.reset(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Categorization Rule'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={ruleForm.handleSubmit(handleRuleSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        {...ruleForm.register('name')}
                        placeholder="e.g., Grocery Stores"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pattern">Pattern (Keywords)</Label>
                      <Input
                        id="pattern"
                        {...ruleForm.register('pattern')}
                        placeholder="e.g., grocery, supermarket, food"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate multiple keywords with commas
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="categoryId">Category</Label>
                      <Select 
                        value={ruleForm.watch('categoryId')?.toString() || ''} 
                        onValueChange={(value) => ruleForm.setValue('categoryId', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={ruleForm.watch('isActive')}
                        onCheckedChange={(checked) => ruleForm.setValue('isActive', checked)}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1" disabled={createRuleMutation.isPending}>
                        {editingRule ? 'Update' : 'Create'} Rule
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {loadingRules ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading rules...</p>
                </div>
              ) : categoryRules && categoryRules.length > 0 ? (
                categoryRules.map((rule) => (
                  <Card key={rule.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Tag className="h-6 w-6 text-blue-500" />
                          <div>
                            <h3 className="font-semibold">{rule.name}</h3>
                            <p className="text-sm text-gray-600">Pattern: {rule.pattern}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            Used {rule.timesUsed} times
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleStatus(rule)}
                          >
                            {rule.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              ruleForm.reset({
                                name: rule.name,
                                pattern: rule.pattern,
                                categoryId: rule.categoryId,
                                isActive: rule.isActive,
                              });
                              // Ensure category ID is properly set for Select component
                              setTimeout(() => {
                                ruleForm.setValue('categoryId', rule.categoryId);
                              }, 0);
                              setIsRuleDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No categorization rules</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create rules to automatically categorize transactions based on keywords.
                  </p>
                  <Button onClick={() => setIsRuleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Rule
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}