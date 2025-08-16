import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Category } from '@/types';

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

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
}

export default function AddBudgetModal({ open, onOpenChange, workspaceId }: AddBudgetModalProps) {
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    month: new Date().getMonth() + 1, // Current month (1-12)
    year: new Date().getFullYear(),
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories - only expense categories (needs & wants)
  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const expenseCategories = categories?.filter(cat => cat.type === 'needs' || cat.type === 'wants') || [];

  const createBudgetMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/budgets`, data),
    onSuccess: () => {
      // Invalidate both budget data and budget limits
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/budgets`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/budget-limits`] });
      
      toast({
        title: "Budget created",
        description: "Your budget has been set successfully.",
      });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      const isLimitError = error.message?.includes('batas maksimal');
      toast({
        variant: "destructive",
        title: isLimitError ? "Limit Budget Tercapai" : "Failed to create budget",
        description: error.message || "Something went wrong",
      });
    },
  });

  const resetForm = () => {
    setForm({
      categoryId: '',
      amount: '',
      period: 'monthly',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount) return;
    
    const budgetData = {
      categoryId: parseInt(form.categoryId),
      amount: parseFloat(form.amount),
      period: form.period,
      month: form.period === 'monthly' ? form.month : null,
      year: form.year,
      workspaceId,
    };
    
    createBudgetMutation.mutate(budgetData);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Budget</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {iconMap[category.icon] || category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="form-field">
            <Label htmlFor="budget-amount">Budget Amount</Label>
            <Input
              id="budget-amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-field">
            <Label htmlFor="budget-period">Budget Period</Label>
            <Select value={form.period} onValueChange={(value: 'monthly' | 'yearly') => setForm({ ...form, period: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.period === 'monthly' && (
            <div className="form-field">
              <Label htmlFor="budget-month">Month</Label>
              <Select value={form.month.toString()} onValueChange={(value) => setForm({ ...form, month: parseInt(value) })}>
                <SelectTrigger>
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
          )}

          <div className="form-field">
            <Label htmlFor="budget-year">Year</Label>
            <Select value={form.year.toString()} onValueChange={(value) => setForm({ ...form, year: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() + i - 2;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createBudgetMutation.isPending || !form.categoryId || !form.amount}
            >
              {createBudgetMutation.isPending ? 'Setting...' : 'Set Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}