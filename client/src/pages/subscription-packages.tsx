import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Package, Star, Check } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SubscriptionPackage {
  id: number;
  name: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxMembers: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface PackageFormData {
  name: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxMembers: number;
  description: string;
  isActive: boolean;
}

export default function SubscriptionPackagesManagement() {
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    price: '0',
    features: [''],
    maxWorkspaces: 1,
    maxMembers: 1,
    description: '',
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages, isLoading: packagesLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/subscription-packages'],
  });

  const createPackageMutation = useMutation({
    mutationFn: async (packageData: PackageFormData) => {
      return apiRequest('/api/subscription-packages', {
        method: 'POST',
        body: packageData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Paket langganan berhasil dibuat.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-packages'] });
      setShowPackageModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat paket langganan.",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, ...packageData }: { id: number } & PackageFormData) => {
      return apiRequest(`/api/subscription-packages/${id}`, {
        method: 'PUT',
        body: packageData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Paket langganan berhasil diupdate.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-packages'] });
      setShowPackageModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal update paket langganan.",
        variant: "destructive",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/subscription-packages/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Paket langganan berhasil dihapus.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-packages'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus paket langganan.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price: '0',
      features: [''],
      maxWorkspaces: 1,
      maxMembers: 1,
      description: '',
      isActive: true
    });
    setEditingPackage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty features
    const cleanedFeatures = formData.features.filter(feature => feature.trim() !== '');
    const dataToSubmit = { ...formData, features: cleanedFeatures };
    
    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, ...dataToSubmit });
    } else {
      createPackageMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      price: pkg.price,
      features: pkg.features.length > 0 ? pkg.features : [''],
      maxWorkspaces: pkg.maxWorkspaces,
      maxMembers: pkg.maxMembers,
      description: pkg.description,
      isActive: pkg.isActive
    });
    setShowPackageModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus paket langganan ini?')) {
      deletePackageMutation.mutate(id);
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData({ ...formData, features: newFeatures });
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? 'Gratis' : `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  if (packagesLoading) {
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
          <h1 className="text-3xl font-bold">Paket Langganan</h1>
          <p className="text-gray-600 mt-2">Kelola paket langganan dan fitur yang tersedia</p>
        </div>
        
        <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Paket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'Edit Paket Langganan' : 'Tambah Paket Langganan Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nama Paket</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Harga (IDR)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxWorkspaces">Max Workspace</Label>
                  <Input
                    id="maxWorkspaces"
                    type="number"
                    min="1"
                    value={formData.maxWorkspaces}
                    onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxMembers">Max Anggota</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="1"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
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

              <div>
                <Label>Fitur-fitur</Label>
                <div className="space-y-2 mt-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="Masukkan fitur..."
                      />
                      {formData.features.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFeature(index)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFeature}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Fitur
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Paket Aktif</Label>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPackageModal(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                >
                  {editingPackage ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {packages?.map((pkg) => (
          <Card key={pkg.id} className={`relative ${pkg.name === 'premium' ? 'border-blue-500 shadow-lg' : ''}`}>
            {pkg.name === 'premium' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Populer
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Package className="h-8 w-8 text-blue-500" />
              </div>
              <CardTitle className="capitalize text-xl">{pkg.name}</CardTitle>
              <div className="text-3xl font-bold text-blue-600">
                {formatPrice(pkg.price)}
                {parseFloat(pkg.price) > 0 && <span className="text-sm text-gray-500">/bulan</span>}
              </div>
              <p className="text-sm text-gray-600">{pkg.description}</p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Max Workspace:</span>
                  <span className="font-medium">{pkg.maxWorkspaces}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Anggota:</span>
                  <span className="font-medium">{pkg.maxMembers}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="font-medium text-sm">Fitur:</h4>
                {pkg.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                  {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <span className="text-xs text-gray-500">
                  {new Date(pkg.createdAt).toLocaleDateString('id-ID')}
                </span>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(pkg)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(pkg.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {packages?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada paket langganan yang tersedia</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}