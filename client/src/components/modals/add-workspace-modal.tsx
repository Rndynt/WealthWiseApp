import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import WorkspaceQuotaBanner from '@/features/workspaces/WorkspaceQuotaBanner';
import type { WorkspaceSubscriptionLimits } from '@/types/subscription';

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

  // Get user subscription limits
  const { data: limits } = useQuery<WorkspaceSubscriptionLimits | null>({
    queryKey: ['/api/user/subscription-limits'],
  });

  const personalLimit = limits?.breakdown.personal.limit ?? null;
  const personalUsed = limits?.breakdown.personal.used ?? 0;
  const hasReachedPersonalLimit = personalLimit !== null && personalUsed >= personalLimit;

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
        title: "Gagal membuat workspace",
        description: error.message || "Terjadi kesalahan",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;
    
    // Check if user can create more workspaces
    if (hasReachedPersonalLimit) {
      toast({
        variant: "destructive",
        title: "Batas workspace tercapai",
        description: `Anda sudah mencapai batas maksimal ${personalLimit} workspace pribadi. Upgrade ke paket premium untuk membuat lebih banyak workspace.`,
      });
      return;
    }
    
    createWorkspaceMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Workspace Baru</DialogTitle>
        </DialogHeader>
        
        {/* Subscription Status */}
        {limits && <WorkspaceQuotaBanner limits={limits} />}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <Label htmlFor="workspace-name">Nama Workspace</Label>
            <Input
              id="workspace-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Budget Keluarga, Bisnis Kecil"
              required
            />
          </div>
          
          <div className="form-field">
            <Label htmlFor="workspace-type">Tipe Workspace</Label>
            <Select value={form.type} onValueChange={(value: any) => setForm({ ...form, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe workspace..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="family">Keluarga</SelectItem>
                <SelectItem value="business">Bisnis Kecil</SelectItem>
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
              Batal
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createWorkspaceMutation.isPending || !form.name || !form.type || hasReachedPersonalLimit}
            >
              {createWorkspaceMutation.isPending ? 'Membuat...' : 'Buat Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
