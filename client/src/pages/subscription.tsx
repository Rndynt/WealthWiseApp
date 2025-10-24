
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Check, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SubscriptionPackage {
  id: number;
  name: string;
  price: string;
  features: string[];
  maxWorkspaces: number | null;
  maxMembers: number | null;
  maxCategories: number | null;
  maxBudgets: number | null;
  maxSharedWorkspaces: number | null;
  canCreateSharedWorkspace: boolean;
  type: 'personal' | 'shared';
  description: string;
  isActive: boolean;
}

interface UserSubscription {
  subscription: {
    id: number;
    packageId: number;
    startDate: string;
    endDate: string;
    status: string;
  };
  package: SubscriptionPackage;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentSubscription } = useQuery<UserSubscription>({
    queryKey: ['/api/user/subscription'],
  });

  const { data: packages } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/subscription-packages'],
  });

  const upgradeMutation = useMutation({
    mutationFn: async (packageId: number) => {
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);

      return apiRequest('POST', '/api/user/subscription', {
        packageId,
        startDate: now.toISOString(),
        endDate: oneMonthLater.toISOString(),
        status: 'active'
      });
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Subscription berhasil diupgrade!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal upgrade subscription.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? 'Gratis' : `Rp ${numPrice.toLocaleString('id-ID')}`;
  };

  const isCurrentPackage = (packageId: number) => {
    return currentSubscription?.subscription.packageId === packageId;
  };

  const canUpgrade = (packageId: number) => {
    if (!currentSubscription) return true;
    return packageId > currentSubscription.subscription.packageId;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription & Pricing</h1>
        <p className="text-gray-600">Pilih paket yang sesuai dengan kebutuhan Anda</p>
        
        {currentSubscription && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Paket Aktif Anda:</h3>
            <p className="text-blue-700 capitalize">
              {currentSubscription.package.name} - {formatPrice(currentSubscription.package.price)}/bulan
            </p>
            <p className="text-sm text-blue-600">
              Aktif sampai: {new Date(currentSubscription.subscription.endDate).toLocaleDateString('id-ID')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages?.filter(pkg => pkg.isActive).map((pkg) => (
          <Card key={pkg.id} className={`relative ${pkg.name === 'professional' ? 'border-blue-500 shadow-lg' : ''}`}>
            {pkg.name === 'professional' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Populer
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <CreditCard className="h-8 w-8 text-blue-500" />
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
                  <span>Workspace Pribadi:</span>
                  <span className="font-medium">{pkg.maxWorkspaces || '∞'}</span>
                </div>
                {pkg.canCreateSharedWorkspace && (
                  <div className="flex justify-between text-sm">
                    <span>Shared Workspace:</span>
                    <span className="font-medium">{pkg.maxSharedWorkspaces || '∞'}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Max Anggota:</span>
                  <span className="font-medium">{pkg.maxMembers || '∞'}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="font-medium text-sm">Fitur:</h4>
                {pkg.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
                {pkg.features.length > 4 && (
                  <p className="text-xs text-gray-500">dan {pkg.features.length - 4} fitur lainnya...</p>
                )}
              </div>

              {isCurrentPackage(pkg.id) ? (
                <Button disabled className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Paket Aktif
                </Button>
              ) : canUpgrade(pkg.id) ? (
                <Button 
                  onClick={() => upgradeMutation.mutate(pkg.id)}
                  disabled={upgradeMutation.isPending}
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {pkg.name === 'basic' ? 'Pilih Gratis' : 'Upgrade'}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full">
                  Downgrade Tidak Tersedia
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Perbandingan Lengkap</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-3 text-left">Fitur</th>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <th key={pkg.id} className="border border-gray-300 p-3 text-center capitalize">
                    {pkg.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Workspace Pribadi</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center">
                    {pkg.maxWorkspaces || '∞'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Shared Workspace</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center">
                    {pkg.canCreateSharedWorkspace ? (pkg.maxSharedWorkspaces || '∞') : '✗'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Max Anggota per Shared Workspace</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center">
                    {pkg.canCreateSharedWorkspace ? (pkg.maxMembers || '∞') : '✗'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Kategori</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center">
                    {pkg.maxCategories || '∞'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Budget Plans</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center">
                    {pkg.maxBudgets || '∞'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">Tipe Paket</td>
                {packages?.filter(pkg => pkg.isActive).map(pkg => (
                  <td key={pkg.id} className="border border-gray-300 p-3 text-center capitalize">
                    {pkg.type}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
