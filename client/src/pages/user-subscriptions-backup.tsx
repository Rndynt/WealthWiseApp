import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Crown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Plus,
  Clock,
  Users,
  Package,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/ui/page-container';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays, addMonths, addYears, isBefore } from 'date-fns';
import { id } from 'date-fns/locale';

interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  createdAt: string;
}

interface SubscriptionPackage {
  id: number;
  name: string;
  price: string;
  description: string;
  maxWorkspaces: number;
  maxMembers: number;
  maxCategories: number | null;
  maxBudgets: number | null;
  canCreateSharedWorkspace: boolean;
  isActive: boolean;
}

interface UserSubscription {
  id: number;
  userId: number;
  packageId: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  user: User;
  package: SubscriptionPackage;
}

interface SubscriptionFormData {
  userId: number;
  packageId: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

export default function UserSubscriptionsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<UserSubscription | null>(null);
  const [formData, setFormData] = useState<SubscriptionFormData>({
    userId: 0,
    packageId: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with their subscriptions - use direct API endpoint
  const { data: subscriptions, isLoading } = useQuery<UserSubscription[]>({
    queryKey: ['/api/admin/user-subscriptions'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/user-subscriptions') as any as UserSubscription[];
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/users') as any as User[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/subscription-packages'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/subscription-packages') as any as SubscriptionPackage[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Mutations
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      return apiRequest('POST', `/api/users/${data.userId}/subscription`, {
        packageId: data.packageId,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        status: data.status
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Subscription berhasil dibuat.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-subscriptions'] });
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat subscription.",
        variant: "destructive",
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData & { subscriptionId: number }) => {
      return apiRequest('PUT', `/api/admin/user-subscriptions/${data.subscriptionId}`, {
        packageId: data.packageId,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        status: data.status
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Subscription berhasil diupdate.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-subscriptions'] });
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal update subscription.",
        variant: "destructive",
      });
    },
  });

  const suspendSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      return apiRequest('PUT', `/api/admin/user-subscriptions/${subscriptionId}`, {
        status: 'cancelled'
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Subscription berhasil dihentikan.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-subscriptions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghentikan subscription.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      userId: 0,
      packageId: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active'
    });
    setEditingSubscription(null);
  };

  const handleEdit = (subscription: UserSubscription) => {
    setEditingSubscription(subscription);
    setFormData({
      userId: subscription.userId,
      packageId: subscription.packageId,
      startDate: subscription.startDate.split('T')[0],
      endDate: subscription.endDate.split('T')[0],
      status: subscription.status as 'active' | 'expired' | 'cancelled'
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubscription) {
      updateSubscriptionMutation.mutate({
        ...formData,
        subscriptionId: editingSubscription.id
      });
    } else {
      createSubscriptionMutation.mutate(formData);
    }
  };

  const extendSubscription = (subscription: UserSubscription, period: 'week' | 'month' | 'year') => {
    const currentEnd = new Date(subscription.endDate);
    let newEnd: Date;

    switch (period) {
      case 'week':
        newEnd = addDays(currentEnd, 7);
        break;
      case 'month':
        newEnd = addMonths(currentEnd, 1);
        break;
      case 'year':
        newEnd = addYears(currentEnd, 1);
        break;
    }

    updateSubscriptionMutation.mutate({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      packageId: subscription.packageId,
      startDate: subscription.startDate,
      endDate: newEnd.toISOString(),
      status: 'active'
    });
  };

  const getStatusBadge = (subscription: UserSubscription) => {
    const isExpired = isBefore(new Date(subscription.endDate), new Date());

    if (subscription.status === 'cancelled') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Diberhentikan</Badge>;
    }

    if (isExpired) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
    }

    if (subscription.status === 'active') {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Aktif</Badge>;
    }

    return <Badge variant="secondary">{subscription.status}</Badge>;
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? 'Gratis' : `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  // Filter data with proper null safety
  const filteredSubscriptions = React.useMemo(() => {
    if (!subscriptions || !Array.isArray(subscriptions)) return [];

    return subscriptions.filter((sub) => {
      if (!sub || !sub.user || !sub.package) return false;

      const matchesSearch = 
        sub.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.package.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      const matchesPackage = packageFilter === 'all' || sub.package.id.toString() === packageFilter;

      return matchesSearch && matchesStatus && matchesPackage;
    });
  }, [subscriptions, searchTerm, statusFilter, packageFilter]);

  if (isLoading || usersLoading || packagesLoading) {
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
      {/* Header */}
      <div className="mb-6 space-y-4">
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Subscription Users
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm px-4">
              Kelola subscription pengguna dalam sistem
            </p>
            <div className="px-4">
              <Button 
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }} 
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Package
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Kelola Subscription Users
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Kelola subscription pengguna dalam sistem
            </p>
          </div>

          <Button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }} 
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Assign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {(filteredSubscriptions || []).filter(s => s?.status === 'active').length}
              </p>
              <p className="text-gray-600">Aktif</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-red-600">
                {(filteredSubscriptions || []).filter(s => s?.endDate && isBefore(new Date(s.endDate), new Date())).length}
              </p>
              <p className="text-gray-600">Expired</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {(filteredSubscriptions || []).filter(s => s?.status === 'cancelled').length}
              </p>
              <p className="text-gray-600">Diberhentikan</p>
            </div>
            <XCircle className="h-8 w-8 text-gray-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {(filteredSubscriptions || []).length}
              </p>
              <p className="text-gray-600">Total</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari user atau package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Diberhentikan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Package</SelectItem>
                {Array.isArray(packages) && packages.length > 0 ? (
                  packages.map((pkg) => {
                    if (!pkg || !pkg.id || !pkg.name) return null;
                    return (
                      <SelectItem key={pkg.id} value={pkg.id.toString()}>
                        {pkg.name} ({formatPrice(pkg.price || '0')})
                      </SelectItem>
                    );
                  }).filter(Boolean)
                ) : (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Subscription Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead>Sisa Hari</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredSubscriptions || []).map((subscription) => {
                const daysRemaining = Math.ceil(
                  (new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subscription.user.name}</p>
                        <p className="text-sm text-gray-500">{subscription.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium capitalize">{subscription.package.name}</p>
                        <p className="text-sm text-gray-500">{formatPrice(subscription.package.price)}/bulan</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription)}</TableCell>
                    <TableCell>
                      {format(new Date(subscription.startDate), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(subscription.endDate), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={daysRemaining < 7 ? 'destructive' : daysRemaining < 30 ? 'secondary' : 'default'}>
                        {daysRemaining > 0 ? `${daysRemaining} hari` : 'Expired'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        {subscription.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => extendSubscription(subscription, 'month')}
                              title="Perpanjang 1 bulan"
                            >
                              <Calendar className="h-4 w-4" />
                              +1M
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => suspendSubscriptionMutation.mutate(subscription.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Hentikan subscription"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {subscription.status === 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSubscriptionMutation.mutate({
                              subscriptionId: subscription.id,
                              userId: subscription.userId,
                              packageId: subscription.packageId,
                              startDate: subscription.startDate,
                              endDate: subscription.endDate,
                              status: 'active'
                            })}
                            className="text-green-600 hover:text-green-800"
                            title="Reaktivasi subscription"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {(!filteredSubscriptions || filteredSubscriptions.length === 0) && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada subscription yang ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? 'Edit Subscription' : 'Assign Package Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="userId">User</Label>
              <Select 
                value={formData.userId.toString()} 
                onValueChange={(value) => setFormData({ ...formData, userId: parseInt(value) })}
                disabled={!!editingSubscription}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih user" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(users) && users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading users...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="packageId">Package</Label>
              <Select 
                value={formData.packageId.toString()} 
                onValueChange={(value) => setFormData({ ...formData, packageId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih package" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(packages) && packages.length > 0 ? (
                    packages.filter(pkg => pkg?.isActive).map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id.toString()}>
                        {pkg.name} - {formatPrice(pkg.price)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      Loading packages...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">Tanggal Berakhir</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'expired' | 'cancelled' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Diberhentikan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={createSubscriptionMutation.isPending || updateSubscriptionMutation.isPending}
              >
                {editingSubscription ? 'Update' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}