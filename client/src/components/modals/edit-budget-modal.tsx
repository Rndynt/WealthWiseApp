import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
interface Budget {
  id: number;
  categoryId: number;
  amount: string;
  year: number;
  month: number;
  workspaceId: number;
}

interface Category {
  id: number;
  name: string;
  color?: string;
  icon?: string;
}
import { notificationService } from '@/lib/notification-service';

const editBudgetSchema = z.object({
  categoryId: z.number().min(1, 'Category is required'),
  amount: z.string().min(1, 'Budget amount is required'),
  year: z.number(),
  month: z.number(),
});

type EditBudgetFormData = z.infer<typeof editBudgetSchema>;

interface EditBudgetModalProps {
  budget: Budget | null;
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
}

export default function EditBudgetModal({ budget, isOpen, onClose, workspaceId }: EditBudgetModalProps) {
  const queryClient = useQueryClient();

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const form = useForm<EditBudgetFormData>({
    resolver: zodResolver(editBudgetSchema),
    defaultValues: {
      categoryId: budget?.categoryId || 0,
      amount: budget?.amount || '0',
      year: budget?.year || new Date().getFullYear(),
      month: budget?.month || new Date().getMonth() + 1,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditBudgetFormData) =>
      apiRequest('PATCH', `/api/workspaces/${workspaceId}/budgets/${budget?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/budgets`] });
      notificationService.success('Budget Updated', 'Budget updated successfully!');
      onClose();
    },
    onError: () => {
      notificationService.error('Update Failed', 'Failed to update budget. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/api/workspaces/${workspaceId}/budgets/${budget?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/budgets`] });
      notificationService.success('Budget Deleted', 'Budget removed successfully!');
      onClose();
    },
    onError: () => {
      notificationService.error('Delete Failed', 'Failed to delete budget. Please try again.');
    },
  });

  const handleSubmit = (data: EditBudgetFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (!budget) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={form.watch('categoryId')?.toString() || ''}
              onValueChange={(value) => form.setValue('categoryId', parseInt(value))}
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

          <div>
            <Label htmlFor="amount">Budget Amount (IDR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...form.register('amount')}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                {...form.register('year', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Select
                value={form.watch('month')?.toString() || ''}
                onValueChange={(value) => form.setValue('month', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Budget'}
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}