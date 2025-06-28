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

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: number;
}

export default function AddCategoryModal({ open, onOpenChange, workspaceId }: AddCategoryModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: '' as 'income' | 'needs' | 'wants' | '',
    icon: '',
    description: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/workspaces/${workspaceId}/categories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/workspaces/${workspaceId}/categories`] });
      toast({
        title: "Category created",
        description: "Your new category has been created successfully.",
      });
      setForm({ name: '', type: '', icon: '', description: '' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create category",
        description: error.message || "Something went wrong",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type || !form.icon) return;
    
    createCategoryMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Food & Dining"
              required
            />
          </div>
          
          <div className="form-field">
            <Label htmlFor="category-type">Category Type</Label>
            <Select value={form.type} onValueChange={(value: any) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="needs">Spending - Needs</SelectItem>
                <SelectItem value="wants">Spending - Wants</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="form-field">
            <Label htmlFor="category-icon">Icon</Label>
            <Select value={form.icon} onValueChange={(value) => setForm({ ...form, icon: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select icon..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="briefcase">💼 Briefcase</SelectItem>
                <SelectItem value="shopping-cart">🛒 Shopping Cart</SelectItem>
                <SelectItem value="bolt">⚡ Electricity</SelectItem>
                <SelectItem value="bus">🚌 Transportation</SelectItem>
                <SelectItem value="tv">📺 Entertainment</SelectItem>
                <SelectItem value="home">🏠 Housing</SelectItem>
                <SelectItem value="car">🚗 Vehicle</SelectItem>
                <SelectItem value="heart">❤️ Healthcare</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="form-field">
            <Label htmlFor="category-description">Description</Label>
            <Textarea
              id="category-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
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
              disabled={createCategoryMutation.isPending || !form.name || !form.type || !form.icon}
            >
              {createCategoryMutation.isPending ? 'Adding...' : 'Add Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
