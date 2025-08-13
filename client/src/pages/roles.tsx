import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, Settings, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Role {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface RoleFormData {
  name: string;
  description: string;
}

export default function RolesManagement() {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
  });

  const { data: rolePermissions } = useQuery<Permission[]>({
    queryKey: [`/api/roles/${selectedRoleId}/permissions`],
    enabled: !!selectedRoleId,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleData: RoleFormData) => {
      return apiRequest('POST', '/api/roles', roleData);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Role berhasil dibuat.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setShowRoleModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat role.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...roleData }: { id: number } & RoleFormData) => {
      return apiRequest('PUT', `/api/roles/${id}`, roleData);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Role berhasil diupdate.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setShowRoleModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal update role.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/roles/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Role berhasil dihapus.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus role.",
        variant: "destructive",
      });
    },
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, action }: { roleId: number; permissionId: number; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('POST', `/api/roles/${roleId}/permissions`, { permissionId });
      } else {
        return apiRequest('DELETE', `/api/roles/${roleId}/permissions/${permissionId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/roles/${selectedRoleId}/permissions`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengubah permission.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingRole(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, ...formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description
    });
    setShowRoleModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus role ini?')) {
      deleteRoleMutation.mutate(id);
    }
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRoleId(role.id);
    setShowPermissionsModal(true);
  };

  const isPermissionAssigned = (permissionId: number) => {
    return rolePermissions?.some(p => p.id === permissionId) || false;
  };

  const handlePermissionToggle = (permissionId: number, isChecked: boolean) => {
    if (!selectedRoleId) return;
    
    togglePermissionMutation.mutate({
      roleId: selectedRoleId,
      permissionId,
      action: isChecked ? 'add' : 'remove'
    });
  };

  const groupPermissionsByResource = (permissions: Permission[]) => {
    const grouped: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });
    return grouped;
  };

  if (rolesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Role</h1>
          <p className="text-gray-600 mt-2">Kelola role dan permission dalam sistem</p>
        </div>
        
        <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Role</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRoleModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                >
                  {editingRole ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Nama</th>
                  <th className="text-left p-4">Deskripsi</th>
                  <th className="text-left p-4">Tanggal Dibuat</th>
                  <th className="text-left p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {roles?.map((role) => (
                  <tr key={role.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-600">{role.description}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-600">
                        {new Date(role.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManagePermissions(role)}
                        >
                          <Settings className="h-4 w-4" />
                          <span className="ml-1">Permissions</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(role.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={role.name === 'root' || role.name === 'admin'} // Prevent deleting system roles
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {roles?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Belum ada role yang terdaftar
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Management Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Kelola Permissions - {roles?.find(r => r.id === selectedRoleId)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {allPermissions && Object.entries(groupPermissionsByResource(allPermissions)).map(([resource, permissions]) => (
              <div key={resource} className="space-y-3">
                <h3 className="text-lg font-semibold capitalize">{resource}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={isPermissionAssigned(permission.id)}
                        onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <label htmlFor={`permission-${permission.id}`} className="text-sm font-medium cursor-pointer">
                          {permission.name}
                        </label>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                      {isPermissionAssigned(permission.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowPermissionsModal(false)}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}