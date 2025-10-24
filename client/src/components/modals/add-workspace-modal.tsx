import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { WorkspaceQuotaBanner } from '@/features/workspaces/WorkspaceQuotaBanner';
import type { Workspace, WorkspaceSubscriptionLimits } from '@/types';

interface AddWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export default function AddWorkspaceModal({ open, onOpenChange, setCurrentWorkspace }: AddWorkspaceModalProps) {
  const [form, setForm] = useState({
    name: '',
    type: '' as 'personal' | 'shared' | '',
  });

  const { toast } = useToast();

  // Get user subscription limits
  const { data: limits } = useQuery<WorkspaceSubscriptionLimits>({
    queryKey: ['/api/user/subscription-limits'],
  });

  const personalLimitReached = limits?.personalLimit !== null && limits?.personalLimit !== undefined
    ? limits.personalOwned >= limits.personalLimit
    : false;

  const sharedLimitReached = limits?.sharedLimit !== null && limits?.sharedLimit !== undefined
    ? limits.sharedOwned >= limits.sharedLimit
    : false;

  const sharedMemberLimit =
    limits?.maxMembers && limits.maxMembers > 0 ? limits.maxMembers.toString() : 'tak terbatas';

  const createWorkspaceMutation = useCreateWorkspace({ setCurrentWorkspace });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return;
    
    // Check if user can create more workspaces
    if (limits) {
      if (
        form.type === 'personal' &&
        limits.personalLimit !== null &&
        limits.personalLimit !== undefined &&
        limits.personalOwned >= limits.personalLimit
      ) {
        toast({
          variant: "destructive",
          title: "Batas workspace pribadi tercapai",
          description: `Anda sudah mencapai batas maksimal ${limits.personalLimit} workspace pribadi. Upgrade paket untuk membuat lebih banyak workspace pribadi.`,
        });
        return;
      }

      if (
        form.type === 'shared' &&
        limits.sharedLimit !== null &&
        limits.sharedLimit !== undefined &&
        limits.sharedOwned >= limits.sharedLimit
      ) {
        toast({
          variant: "destructive",
          title: "Batas shared workspace tercapai",
          description: limits.sharedLimit === 0
            ? 'Paket Anda saat ini belum mendukung pembuatan shared workspace. Pertimbangkan upgrade paket.'
            : `Anda sudah mencapai batas maksimal ${limits.sharedLimit} shared workspace yang dapat Anda buat. Upgrade paket untuk membuat lebih banyak shared workspace.`,
        });
        return;
      }
    }
    
    const payload = { name: form.name, type: form.type as 'personal' | 'shared' };

    createWorkspaceMutation.mutate(payload, {
      onSuccess: () => {
        setForm({ name: '', type: '' });
        onOpenChange(false);
      },
    });
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
              placeholder="mis. Anggaran Pribadi, Proyek Tim"
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
                <SelectItem value="personal" disabled={personalLimitReached}>
                  Personal (Solo)
                </SelectItem>
                <SelectItem value="shared" disabled={sharedLimitReached || limits?.sharedLimit === 0}>
                  Shared (Kolaboratif)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Personal cocok untuk penggunaan individu tanpa anggota tambahan. Shared memungkinkan kolaborasi dengan hingga{' '}
              {sharedMemberLimit} anggota (termasuk Anda) sesuai paket langganan Anda.
            </p>
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
              disabled={
                createWorkspaceMutation.isPending ||
                !form.name ||
                !form.type ||
                (form.type === 'personal' && personalLimitReached) ||
                (form.type === 'shared' && (sharedLimitReached || limits?.sharedLimit === 0))
              }
            >
              {createWorkspaceMutation.isPending ? 'Membuat...' : 'Buat Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
