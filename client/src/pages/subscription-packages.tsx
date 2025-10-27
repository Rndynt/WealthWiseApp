import { useState, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageContainer } from '@/components/ui/page-container';
import { SubscriptionLimitScope, SubscriptionPackageLimitConfig, SubscriptionLimitResource } from '@/types';

interface SubscriptionPackage {
  id: number;
  name: string;
  slug: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxAccounts: number;
  maxMembers: number;
  maxCategories: number | null;
  maxBudgets: number | null;
  maxSharedWorkspaces: number | null;
  canCreateSharedWorkspace: boolean;
  type: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  limits: SubscriptionPackageLimitConfig[];
}

interface PackageFormData {
  name: string;
  slug: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxAccounts: number;
  maxMembers: number;
  maxCategories: number | null;
  maxBudgets: number | null;
  maxSharedWorkspaces: number | null;
  canCreateSharedWorkspace: boolean;
  type: string;
  description: string;
  isActive: boolean;
}

type PackageSubmitPayload = PackageFormData & { limits: SubscriptionPackageLimitConfig[] };

const LIMIT_RESOURCE_ORDER: SubscriptionLimitResource[] = ['accounts', 'categories', 'budgets'];

const LIMIT_RESOURCE_METADATA: Record<SubscriptionLimitResource, { label: string; description: string }> = {
  accounts: {
    label: 'Akun Keuangan',
    description: 'Batas jumlah akun atau rekening yang dapat dibuat user.',
  },
  categories: {
    label: 'Kategori Transaksi',
    description: 'Mengatur jumlah kategori custom yang bisa dimiliki user.',
  },
  budgets: {
    label: 'Rencana Anggaran',
    description: 'Kontrol berapa banyak budget plan aktif per user/workspace.',
  },
};

const SCOPE_LABELS: Record<SubscriptionLimitScope, string> = {
  per_workspace: 'Per Workspace',
  global_user: 'Global User',
};

const SCOPE_DESCRIPTIONS: Record<SubscriptionLimitScope, string> = {
  per_workspace: 'Limit akan diterapkan pada setiap workspace secara terpisah.',
  global_user: 'Limit dihitung secara agregat di semua workspace milik user.',
};

const formatLimitValue = (value: number | null | undefined) => {
  if (value === null || typeof value === 'undefined') {
    return '∞';
  }

  return value.toString();
};

const createLimitState = (source?: SubscriptionPackageLimitConfig[]): SubscriptionPackageLimitConfig[] => {
  const map = new Map<SubscriptionLimitResource, SubscriptionPackageLimitConfig>();
  (source ?? []).forEach((limit) => {
    if (!map.has(limit.resource)) {
      map.set(limit.resource, { ...limit });
    }
  });

  return LIMIT_RESOURCE_ORDER.map((resource) => {
    const existing = map.get(resource);
    if (existing) {
      return { ...existing };
    }

    return {
      resource,
      scope: 'per_workspace',
      limit: null,
    };
  });
};

export default function SubscriptionPackagesManagement() {
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    slug: '',
    price: '0',
    features: [''],
    maxWorkspaces: 1,
    maxAccounts: 1,
    maxMembers: 1,
    maxCategories: null,
    maxBudgets: null,
    maxSharedWorkspaces: 0,
    canCreateSharedWorkspace: false,
    type: 'personal',
    description: '',
    isActive: true
  });
  const [limitConfigs, setLimitConfigs] = useState<SubscriptionPackageLimitConfig[]>(() => createLimitState());
  const lastFiniteLimitRef = useRef<Record<SubscriptionLimitResource, number>>({
    accounts: 1,
    categories: 1,
    budgets: 1,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateLimitConfig = (resource: SubscriptionLimitResource, updates: Partial<SubscriptionPackageLimitConfig>) => {
    setLimitConfigs((prev) =>
      prev.map((limit) => (limit.resource === resource ? { ...limit, ...updates } : limit))
    );
  };

  const handleLimitScopeChange = (resource: SubscriptionLimitResource, scope: SubscriptionLimitScope) => {
    updateLimitConfig(resource, { scope });
  };

  const handleLimitValueChange = (resource: SubscriptionLimitResource, value: string) => {
    if (value === '') {
      updateLimitConfig(resource, { limit: null });
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    const nextValue = Math.max(0, Math.floor(numericValue));
    lastFiniteLimitRef.current[resource] = nextValue;
    updateLimitConfig(resource, { limit: nextValue });
  };

  const handleUnlimitedToggle = (resource: SubscriptionLimitResource, unlimited: boolean) => {
    setLimitConfigs((prev) =>
      prev.map((limit) => {
        if (limit.resource !== resource) {
          return limit;
        }

        if (unlimited) {
          return { ...limit, limit: null };
        }

        const fallbackValue = lastFiniteLimitRef.current[resource] ?? 1;
        return { ...limit, limit: fallbackValue > 0 ? fallbackValue : 1 };
      })
    );
  };

  const hydrateLastFiniteLimits = (limits: SubscriptionPackageLimitConfig[]) => {
    const snapshot: Record<SubscriptionLimitResource, number> = {
      accounts: 1,
      categories: 1,
      budgets: 1,
    };
    limits.forEach((limit) => {
      if (limit.limit !== null) {
        snapshot[limit.resource] = limit.limit;
      }
    });
    lastFiniteLimitRef.current = snapshot;
  };

  const { data: packages, isLoading: packagesLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/subscription-packages'],
  });

  const createPackageMutation = useMutation({
    mutationFn: async (packageData: PackageSubmitPayload) => {
      return apiRequest('POST', '/api/subscription-packages', packageData);
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
    mutationFn: async ({ id, ...packageData }: { id: number } & PackageSubmitPayload) => {
      return apiRequest('PUT', `/api/subscription-packages/${id}`, packageData);
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
      return apiRequest('DELETE', `/api/subscription-packages/${id}`);
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
      slug: '',
      price: '0',
      features: [''],
      maxWorkspaces: 1,
      maxAccounts: 1,
      maxMembers: 1,
      maxCategories: null,
      maxBudgets: null,
      maxSharedWorkspaces: 0,
      canCreateSharedWorkspace: false,
      type: 'personal',
      description: '',
      isActive: true
    });
    setEditingPackage(null);
    setLimitConfigs(createLimitState());
    lastFiniteLimitRef.current = { accounts: 1, categories: 1, budgets: 1 };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedFeatures = Array.from(
      new Set(
        formData.features
          .map((feature) => feature.trim())
          .filter((feature) => feature.length > 0)
      )
    );
    const dataToSubmit = {
      ...formData,
      slug: formData.slug.trim(),
      features: cleanedFeatures.length > 0 ? cleanedFeatures : ['Fitur utama'],
      limits: limitConfigs.map((limit) => ({ ...limit })),
    };

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
      slug: pkg.slug,
      price: pkg.price,
      features: pkg.features.length > 0 ? pkg.features : [''],
      maxWorkspaces: pkg.maxWorkspaces ?? 1,
      maxAccounts: pkg.maxAccounts ?? 1,
      maxMembers: pkg.maxMembers ?? 1,
      maxCategories: pkg.maxCategories,
      maxBudgets: pkg.maxBudgets,
      maxSharedWorkspaces: pkg.maxSharedWorkspaces ?? null,
      canCreateSharedWorkspace: pkg.canCreateSharedWorkspace,
      type: pkg.type,
      description: pkg.description,
      isActive: pkg.isActive
    });
    setLimitConfigs(createLimitState(pkg.limits));
    hydrateLastFiniteLimits(pkg.limits);
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
      <div className="mb-6 space-y-4">
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paket Langganan
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm px-4">
              Kelola paket langganan dan fitur yang tersedia
            </p>
            <div className="px-4">
              <Button 
                onClick={() => {
                  resetForm();
                  setShowPackageModal(true);
                }} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Paket Baru
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Paket Langganan
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Kelola paket langganan dan fitur yang tersedia
            </p>
          </div>
          
          <Button 
            onClick={() => {
              resetForm();
              setShowPackageModal(true);
            }} 
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>

      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
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

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Contoh: shared-default"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gunakan slug unik tanpa spasi untuk identifikasi paket secara konsisten.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxWorkspaces">Max Workspace Pribadi</Label>
                  <Input
                    id="maxWorkspaces"
                    type="number"
                    min="1"
                    value={formData.maxWorkspaces}
                    onChange={(e) => {
                      const numericValue = Number.parseInt(e.target.value, 10);
                      setFormData((prev) => ({
                        ...prev,
                        maxWorkspaces: Number.isNaN(numericValue) ? prev.maxWorkspaces : Math.max(1, numericValue),
                      }));
                    }}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="maxAccounts">Max Akun Keuangan</Label>
                  <Input
                    id="maxAccounts"
                    type="number"
                    min="1"
                    value={formData.maxAccounts}
                    onChange={(e) => {
                      const numericValue = Number.parseInt(e.target.value, 10);
                      setFormData((prev) => ({
                        ...prev,
                        maxAccounts: Number.isNaN(numericValue) ? prev.maxAccounts : Math.max(1, numericValue),
                      }));
                    }}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Digunakan sebagai fallback default untuk limit akun.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxCategories">Max Kategori</Label>
                  <Input
                    id="maxCategories"
                    type="number"
                    min="1"
                    value={formData.maxCategories ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        setFormData((prev) => ({ ...prev, maxCategories: null }));
                        return;
                      }

                      const numericValue = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(numericValue)) {
                        return;
                      }

                      setFormData((prev) => ({ ...prev, maxCategories: Math.max(1, numericValue) }));
                    }}
                    placeholder="Kosong = unlimited"
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxBudgets">Max Budget Plans</Label>
                  <Input
                    id="maxBudgets"
                    type="number"
                    min="1"
                    value={formData.maxBudgets ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        setFormData((prev) => ({ ...prev, maxBudgets: null }));
                        return;
                      }

                      const numericValue = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(numericValue)) {
                        return;
                      }

                      setFormData((prev) => ({ ...prev, maxBudgets: Math.max(1, numericValue) }));
                    }}
                    placeholder="Kosong = unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="canCreateSharedWorkspace"
                  checked={formData.canCreateSharedWorkspace}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      canCreateSharedWorkspace: checked,
                      maxSharedWorkspaces:
                        checked
                          ? prev.maxSharedWorkspaces === null || prev.maxSharedWorkspaces === 0
                            ? 1
                            : prev.maxSharedWorkspaces
                          : 0,
                    }))
                  }
                />
                <Label htmlFor="canCreateSharedWorkspace">Dapat Membuat Shared Workspace</Label>
              </div>

              {formData.canCreateSharedWorkspace && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxSharedWorkspaces">Max Shared Workspace</Label>
                    <Input
                      id="maxSharedWorkspaces"
                      type="number"
                      min="0"
                      value={formData.maxSharedWorkspaces ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setFormData((prev) => ({ ...prev, maxSharedWorkspaces: null }));
                          return;
                        }

                        const numericValue = Number.parseInt(e.target.value, 10);
                        if (Number.isNaN(numericValue)) {
                          return;
                        }

                        setFormData((prev) => ({ ...prev, maxSharedWorkspaces: Math.max(0, numericValue) }));
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Kosong = unlimited, 0 menonaktifkan pembuatan workspace baru.</p>
                  </div>

                  <div>
                    <Label htmlFor="maxMembers">Max Anggota per Shared Workspace</Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="1"
                      value={formData.maxMembers}
                      onChange={(e) => {
                        const numericValue = Number.parseInt(e.target.value, 10);
                        setFormData((prev) => ({
                          ...prev,
                          maxMembers: Number.isNaN(numericValue) ? prev.maxMembers : Math.max(1, numericValue),
                        }));
                      }}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="type">Tipe Paket</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe paket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="shared">Shared Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Personal + Shared)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Konfigurasi Limit Resource</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tentukan scope limit (per workspace atau global user) beserta jumlah maksimum untuk setiap resource utama.
                  </p>
                </div>

                <div className="space-y-4">
                  {limitConfigs.map((limit) => {
                    const meta = LIMIT_RESOURCE_METADATA[limit.resource];
                    return (
                      <div
                        key={limit.resource}
                        className="space-y-3 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/60 p-3 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{meta.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{meta.description}</p>
                          </div>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {formatLimitValue(limit.limit)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Scope Limit</Label>
                            <Select
                              value={limit.scope}
                              onValueChange={(value) => handleLimitScopeChange(limit.resource, value as SubscriptionLimitScope)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih scope" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(SCOPE_LABELS).map(([scopeKey, label]) => (
                                  <SelectItem key={scopeKey} value={scopeKey}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{SCOPE_DESCRIPTIONS[limit.scope]}</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`limit-${limit.resource}`} className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Jumlah Maksimum
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                id={`limit-${limit.resource}`}
                                type="number"
                                min="0"
                                disabled={limit.limit === null}
                                value={limit.limit === null ? '' : limit.limit}
                                onChange={(e) => handleLimitValueChange(limit.resource, e.target.value)}
                              />
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <Switch
                                  id={`limit-${limit.resource}-unlimited`}
                                  checked={limit.limit === null}
                                  onCheckedChange={(checked) => handleUnlimitedToggle(limit.resource, checked)}
                                />
                                <span>Unlimited</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Kosongkan nilai atau aktifkan unlimited untuk memberikan akses tanpa batas.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  <span>Max Workspace Pribadi:</span>
                  <span className="font-medium">{formatLimitValue(pkg.maxWorkspaces)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Akun Keuangan:</span>
                  <span className="font-medium">{formatLimitValue(pkg.maxAccounts)}</span>
                </div>
                {pkg.canCreateSharedWorkspace && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Max Shared Workspace:</span>
                      <span className="font-medium">{formatLimitValue(pkg.maxSharedWorkspaces)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Max Anggota per Shared:</span>
                      <span className="font-medium">{formatLimitValue(pkg.maxMembers)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span>Max Kategori:</span>
                  <span className="font-medium">{formatLimitValue(pkg.maxCategories)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Budget Plans:</span>
                  <span className="font-medium">{formatLimitValue(pkg.maxBudgets)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tipe:</span>
                  <span className="font-medium capitalize">{pkg.type}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200">Limit Resource</h4>
                <div className="space-y-2">
                  {pkg.limits.map((limit) => {
                    const meta = LIMIT_RESOURCE_METADATA[limit.resource];
                    return (
                      <div
                        key={limit.resource}
                        className="flex items-center justify-between rounded-md border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">{meta.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{SCOPE_LABELS[limit.scope]}</p>
                        </div>
                        <Badge variant="secondary" className="ml-4">
                          {formatLimitValue(limit.limit)}
                        </Badge>
                      </div>
                    );
                  })}
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
    </PageContainer>
  );
}