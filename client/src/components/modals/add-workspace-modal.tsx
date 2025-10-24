import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    type: '' as 'personal' | 'shared' | '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user subscription limits
  const { data: limits } = useQuery<{ maxWorkspaces: number; maxMembers: number; currentWorkspaces: number }>({
    queryKey: ['/api/user/subscription-limits'],
  });

  const sharedMemberLimit =
    limits?.maxMembers && limits.maxMembers > 0 ? limits.maxMembers.toString() : 'beberapa';

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
    if (limits && limits.currentWorkspaces >= limits.maxWorkspaces) {
      toast({
        variant: "destructive",
        title: "Batas workspace tercapai",
        description: `Anda sudah mencapai batas maksimal ${limits.maxWorkspaces} workspace. Upgrade ke paket premium untuk membuat lebih banyak workspace.`,
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
        {limits && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Status Langganan:</strong> {limits.currentWorkspaces}/{limits.maxWorkspaces} workspace terpakai
            </p>
            {limits.currentWorkspaces >= limits.maxWorkspaces && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ Anda telah mencapai batas maksimal. Upgrade ke premium untuk membuat lebih banyak workspace.
              </p>
            )}
          </div>
        )}
        
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
                <SelectItem value="personal">Personal (Solo)</SelectItem>
                <SelectItem value="shared">Shared (Kolaboratif)</SelectItem>
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
              disabled={createWorkspaceMutation.isPending || !form.name || !form.type || (limits ? limits.currentWorkspaces >= limits.maxWorkspaces : false)}
            >
              {createWorkspaceMutation.isPending ? 'Membuat...' : 'Buat Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
