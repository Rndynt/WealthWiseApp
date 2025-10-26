
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
  currency: string;
  notes?: string | null;
  workspaceId: number;
}
import { notificationService } from '@/lib/notification-service';

const editAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['transaction', 'asset']),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional(),
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

  const formattedBalance = React.useMemo(() => {
    if (!account) return '';
    const value = parseFloat(account.balance ?? '0');
    if (Number.isNaN(value)) {
      return account.balance;
    }
    const locale = account.currency === 'IDR' ? 'id-ID' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: account.currency,
      minimumFractionDigits: 0,
    }).format(value);
  }, [account]);

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
      currency: account?.currency || 'IDR',
      notes: account?.notes ?? '',
    },
  });

  // Reset form when account changes
  React.useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        type: account.type as any,
        currency: account.currency,
        notes: account.notes ?? '',
      });
    }
  }, [account, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: EditAccountFormData) =>
      apiRequest('PUT', `/api/accounts/${account?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      notificationService.success('Account Updated', 'Account details updated successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Update account error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update account. Please try again.';
      notificationService.error('Update Failed', message);
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
      const message = error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
      notificationService.error('Delete Failed', message);
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
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={watch('currency')}
              onValueChange={(value) => setValue('currency', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-sm text-red-600 mt-1">{errors.currency.message}</p>
            )}
          </div>

          <div>
            <Label>Current Balance</Label>
            <Input value={formattedBalance} readOnly disabled />
            <p className="text-sm text-gray-500 mt-1">
              Balance is calculated automatically from transactions and cannot be edited manually.
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Optional notes about this account"
              rows={3}
            />
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
