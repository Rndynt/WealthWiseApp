import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
}

export default function AddAccountModal({ open, onOpenChange, workspaceId }: AddAccountModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: '' as 'transaction' | 'asset' | '',
    currency: 'IDR',
    balance: '0',
    notes: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAccountMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/accounts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      toast({
        title: "Account created",
        description: "Your new account has been created successfully.",
      });
      setForm({ name: '', type: '', currency: 'IDR', balance: '0', notes: '' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create account",
        description: error.message || "Something went wrong",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;
    
    createAccountMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., BCA Savings"
              required
            />
          </div>
          
          <div className="form-field">
            <Label htmlFor="account-type">Account Type</Label>
            <Select value={form.type} onValueChange={(value: any) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="form-field">
            <Label htmlFor="account-currency">Currency</Label>
            <Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">Indonesian Rupiah (IDR)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="form-field">
            <Label htmlFor="account-balance">Initial Balance</Label>
            <Input
              id="account-balance"
              type="number"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="form-field">
            <Label htmlFor="account-notes">Notes</Label>
            <Textarea
              id="account-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes about this account"
              rows={3}
            />
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
              disabled={createAccountMutation.isPending || !form.name || !form.type}
            >
              {createAccountMutation.isPending ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
