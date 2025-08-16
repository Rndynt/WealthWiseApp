import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Account, Category, Debt } from '@/types';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
}

type TransactionType = 'income' | 'expense' | 'transfer' | 'saving' | 'debt' | 'repayment';

export default function AddTransactionModal({ open, onOpenChange, workspaceId }: AddTransactionModalProps) {
  const [form, setForm] = useState({
    type: '' as TransactionType | '',
    amount: '',
    description: '',
    date: new Date(),
    accountId: '',
    categoryId: '',
    toAccountId: '', // For transfers
    debtId: '', // For debt repayments
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts and categories
  const { data: accounts } = useQuery<Account[]>({
    queryKey: [`/api/workspaces/${workspaceId}/accounts`],
    enabled: !!workspaceId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/workspaces/${workspaceId}/categories`],
    enabled: !!workspaceId,
  });

  const { data: debts } = useQuery<Debt[]>({
    queryKey: [`/api/workspaces/${workspaceId}/debts`],
    enabled: !!workspaceId,
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/transactions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/accounts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/dashboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/debts`] });
      
      toast({
        title: "Transaction created",
        description: form.type === 'repayment' 
          ? "Debt repayment recorded and debt balance updated"
          : "Your transaction has been recorded successfully.",
      });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create transaction",
        description: error.message || "Something went wrong",
      });
    },
  });

  const resetForm = () => {
    setForm({
      type: '',
      amount: '',
      description: '',
      date: new Date(),
      accountId: '',
      categoryId: '',
      toAccountId: '',
      debtId: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!form.type || !form.amount || !form.description || !form.accountId) return;
    if (form.type === 'repayment' && !form.debtId) {
      toast({
        variant: "destructive",
        title: "Repayment Error",
        description: "Please select a debt to repay",
      });
      return;
    }
    
    const transactionData = {
      ...form,
      amount: parseFloat(form.amount),
      accountId: parseInt(form.accountId),
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      toAccountId: form.toAccountId ? parseInt(form.toAccountId) : undefined,
      debtId: form.debtId ? parseInt(form.debtId) : undefined,
      workspaceId,
    };
    
    createTransactionMutation.mutate(transactionData);
  };

  const getFilteredCategories = () => {
    if (!categories) return [];
    
    if (form.type === 'income') {
      return categories.filter(cat => cat.type === 'income');
    } else if (form.type === 'expense') {
      return categories.filter(cat => cat.type === 'needs' || cat.type === 'wants');
    }
    
    return [];
  };

  const isTransfer = form.type === 'transfer';
  const requiresCategory = form.type === 'income' || form.type === 'expense';
  const isRepayment = form.type === 'repayment';
  
  // Get active debts for repayment selection
  const getActiveDebts = () => {
    return debts?.filter(debt => debt.status === 'active' && parseFloat(debt.remainingAmount) > 0) || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="transaction-type">Transaction Type</Label>
            <Select value={form.type} onValueChange={(value: TransactionType) => setForm({ ...form, type: value, categoryId: '', toAccountId: '', debtId: '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="saving">Saving</SelectItem>
                <SelectItem value="debt">Debt</SelectItem>
                <SelectItem value="repayment">Repayment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="form-field">
            <Label htmlFor="transaction-amount">Amount</Label>
            <Input
              id="transaction-amount"
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
            <Label htmlFor="transaction-description">Description</Label>
            <Input
              id="transaction-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Salary payment, Grocery shopping"
              required
            />
          </div>

          <div className="form-field">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.date ? format(form.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.date}
                  onSelect={(date) => date && setForm({ ...form, date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="form-field">
            <Label htmlFor="transaction-account">Account</Label>
            <Select value={form.accountId} onValueChange={(value) => setForm({ ...form, accountId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTransfer && (
            <div className="form-field">
              <Label htmlFor="transaction-to-account">To Account</Label>
              <Select value={form.toAccountId} onValueChange={(value) => setForm({ ...form, toAccountId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.filter(acc => acc.id.toString() !== form.accountId).map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requiresCategory && (
            <div className="form-field">
              <Label htmlFor="transaction-category">Category</Label>
              <Select value={form.categoryId} onValueChange={(value) => setForm({ ...form, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredCategories().map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isRepayment && (
            <div className="form-field">
              <Label htmlFor="transaction-debt">Select Debt to Repay</Label>
              <Select value={form.debtId} onValueChange={(value) => setForm({ ...form, debtId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select debt..." />
                </SelectTrigger>
                <SelectContent>
                  {getActiveDebts().map((debt) => (
                    <SelectItem key={debt.id} value={debt.id.toString()}>
                      {debt.name} (Remaining: {parseFloat(debt.remainingAmount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getActiveDebts().length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No active debts available for repayment</p>
              )}
            </div>
          )}
          
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
              disabled={createTransactionMutation.isPending || !form.type || !form.amount || !form.description || !form.accountId}
            >
              {createTransactionMutation.isPending ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}