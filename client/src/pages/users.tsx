import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, UserCog, Shield, Crown } from 'lucide-react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageContainer } from '@/components/ui/page-container';

interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  roleId: number;
}

export default function UsersManagement() {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    roleId: 3
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      return apiRequest('POST', '/api/auth/register', userData);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "User berhasil dibuat.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowUserModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat user.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: { id: number } & Partial<UserFormData>) => {
      return apiRequest('PUT', `/api/users/${id}`, userData);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "User berhasil diupdate.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowUserModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal update user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "User berhasil dihapus.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus user.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      roleId: 3
    });
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      const updateData: any = {
        id: editingUser.id,
        name: formData.name,
        roleId: formData.roleId,
      };
      
      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }
      
      updateUserMutation.mutate(updateData);
    } else {
      if (!formData.password) {
        toast({
          title: "Error",
          description: "Password wajib diisi untuk user baru.",
          variant: "destructive",
        });
        return;
      }
      createUserMutation.mutate(formData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.roleId
    });
    setShowUserModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const getRoleName = (roleId: number) => {
    const role = roles?.find(r => r.id === roleId);
    return role?.name || 'Unknown';
  };

  const getRoleIcon = (roleId: number) => {
    const role = roles?.find(r => r.id === roleId);
    switch (role?.name) {
      case 'root': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <UserCog className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (roleId: number) => {
    const role = roles?.find(r => r.id === roleId);
    switch (role?.name) {
      case 'root': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
    }
  };

  if (usersLoading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" />
                Manajemen User
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Kelola user dan role dalam sistem
              </p>
            </div>
            
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Button 
                onClick={() => {
                  resetForm();
                  setShowUserModal(true);
                }} 
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah User
              </Button>
            </div>
          </div>
        </div>

      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Tambah User Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!editingUser} // Disable email editing
                />
              </div>
              
              <div>
                <Label htmlFor="password">
                  Password {editingUser && '(kosongkan jika tidak ingin mengubah)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.roleId.toString()} onValueChange={(value) => setFormData({ ...formData, roleId: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(role.id)}
                          <span>{role.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {editingUser ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Daftar User</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Nama</th>
                    <th className="text-left p-3 text-sm font-medium">Email</th>
                    <th className="text-left p-3 text-sm font-medium">Role</th>
                    <th className="text-left p-3 text-sm font-medium">Tanggal</th>
                    <th className="text-left p-3 text-sm font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div className="font-medium text-sm">{user.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-600 dark:text-gray-400 text-sm">{user.email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={getRoleBadgeVariant(user.roleId)} className="flex items-center space-x-1 w-fit text-xs">
                          {getRoleIcon(user.roleId)}
                          <span>{getRoleName(user.roleId)}</span>
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-gray-600 dark:text-gray-400 text-sm">
                          {new Date(user.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {users?.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">{user.email}</div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(user)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(user.id)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Badge variant={getRoleBadgeVariant(user.roleId)} className="flex items-center space-x-1 text-xs">
                    {getRoleIcon(user.roleId)}
                    <span>{getRoleName(user.roleId)}</span>
                  </Badge>
                  <div className="text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {users?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Belum ada user yang terdaftar
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}