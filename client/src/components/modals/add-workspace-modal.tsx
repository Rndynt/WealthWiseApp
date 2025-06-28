import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AddWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddWorkspaceModal({ open, onOpenChange }: AddWorkspaceModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: '' as 'personal' | 'family' | 'business' | '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createWorkspaceMutation = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      apiRequest('POST', '/api/workspaces', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });
      toast({
        title: "Workspace created",
        description: "Your new workspace has been created successfully.",
      });
      setForm({ name: '', type: '' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create workspace",
        description: error.message || "Something went wrong",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;
    
    createWorkspaceMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Family Budget, Small Business"
              required
            />
          </div>
          
          <div className="form-field">
            <Label htmlFor="workspace-type">Workspace Type</Label>
            <Select value={form.type} onValueChange={(value: any) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="business">Small Business</SelectItem>
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
              disabled={createWorkspaceMutation.isPending || !form.name || !form.type}
            >
              {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
