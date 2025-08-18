
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
  workspaceId: number;
}
import { notificationService } from '@/lib/notification-service';

const editAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['transaction', 'asset']),
  balance: z.string().min(1, 'Balance is required'),
});

type EditAccountFormData = z.infer<typeof editAccountSchema>;

interface EditAccountModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  workspaceId: number;
}

export default function EditAccountModal({ account, isOpen, onClose, workspaceId }: EditAccountModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema),
    defaultValues: {
      name: account?.name || '',
      type: (account?.type as any) || 'transaction',
      balance: account?.balance || '0',
    },
  });

  // Reset form when account changes
  React.useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type as any,
        balance: account.balance,
      });
    }
  }, [account, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EditAccountFormData) =>
      apiRequest('PATCH', `/api/accounts/${account?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      notificationService.success('Account Updated', 'Account details updated successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Update account error:', error);
      notificationService.error('Update Failed', 'Failed to update account. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/api/accounts/${account?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      notificationService.success('Account Deleted', 'Account removed successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Delete account error:', error);
      notificationService.error('Delete Failed', 'Failed to delete account. Please try again.');
    },
  });

  const onSubmit = (data: EditAccountFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Main Checking"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Account Type</Label>
            <Select
              value={watch('type')}
              onValueChange={(value) => setValue('type', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="balance">Balance ({account?.currency || 'IDR'})</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              {...register('balance')}
              placeholder="0.00"
            />
            {errors.balance && (
              <p className="text-sm text-red-600 mt-1">{errors.balance.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Account'}
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
