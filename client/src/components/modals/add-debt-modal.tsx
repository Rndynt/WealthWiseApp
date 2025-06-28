import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

interface AddDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
}

export default function AddDebtModal({ open, onOpenChange, workspaceId }: AddDebtModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: '' as 'debt' | 'credit' | '',
    totalAmount: '',
    remainingAmount: '',
    interestRate: '',
    dueDate: undefined as Date | undefined,
    status: 'active' as 'active' | 'paid' | 'overdue',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDebtMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/debts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/debts`] });
      
      toast({
        title: "Debt record created",
        description: "Your debt has been recorded successfully.",
      });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create debt record",
        description: error.message || "Something went wrong",
      });
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      type: '',
      totalAmount: '',
      remainingAmount: '',
      interestRate: '',
      dueDate: undefined,
      status: 'active',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.totalAmount || !form.remainingAmount) return;
    
    const debtData = {
      name: form.name,
      type: form.type,
      totalAmount: parseFloat(form.totalAmount),
      remainingAmount: parseFloat(form.remainingAmount),
      interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
      dueDate: form.dueDate || null,
      status: form.status,
      workspaceId,
    };
    
    createDebtMutation.mutate(debtData);
  };

  const handleTotalAmountChange = (value: string) => {
    setForm({ 
      ...form, 
      totalAmount: value,
      // Auto-fill remaining amount if it's empty
      remainingAmount: form.remainingAmount || value
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Debt Record</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="debt-name">Name</Label>
            <Input
              id="debt-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Car Loan, Credit Card"
              required
            />
          </div>

          <div className="form-field">
            <Label htmlFor="debt-type">Type</Label>
            <Select value={form.type} onValueChange={(value: 'debt' | 'credit') => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debt">Debt (Money you owe)</SelectItem>
                <SelectItem value="credit">Credit (Money owed to you)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="form-field">
            <Label htmlFor="debt-total">Total Amount</Label>
            <Input
              id="debt-total"
              type="number"
              value={form.totalAmount}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-field">
            <Label htmlFor="debt-remaining">Remaining Amount</Label>
            <Input
              id="debt-remaining"
              type="number"
              value={form.remainingAmount}
              onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-field">
            <Label htmlFor="debt-interest">Interest Rate (%)</Label>
            <Input
              id="debt-interest"
              type="number"
              value={form.interestRate}
              onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-field">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.dueDate ? format(form.dueDate, "PPP") : <span>Select due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.dueDate}
                  onSelect={(date) => setForm({ ...form, dueDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="form-field">
            <Label htmlFor="debt-status">Status</Label>
            <Select value={form.status} onValueChange={(value: 'active' | 'paid' | 'overdue') => setForm({ ...form, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
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
              disabled={createDebtMutation.isPending || !form.name || !form.type || !form.totalAmount || !form.remainingAmount}
            >
              {createDebtMutation.isPending ? 'Adding...' : 'Add Debt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}