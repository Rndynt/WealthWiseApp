import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import {
  Crown,
  Star,
  CheckCircle,
  CreditCard,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (error: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface SubscriptionPackage {
  id: number;
  name: string;
  slug: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxMembers: number;
  maxCategories: number | null;
  maxBudgets: number | null;
  type: string;
  description: string;
  isActive: boolean;
}

interface UserSubscription {
  id: number;
  userId: string;
  packageId: number;
  startDate: string;
  endDate: string;
  status: string;
  package: SubscriptionPackage;
}

interface PaymentConfigResponse {
  clientKey: string | null;
  merchantId: string | null;
  snapScriptUrl: string;
  isProduction: boolean;
  isConfigured: boolean;
}

interface MidtransTransactionResponse {
  token: string;
  redirectUrl: string;
  orderId: string;
  grossAmount: number;
}

export default function UpgradePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [isSnapLoaded, setIsSnapLoaded] = useState(false);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return Number.isNaN(num) || num === 0 ? 'Gratis' : `Rp ${num.toLocaleString('id-ID')}`;
  };

  const { data: currentSubscription } = useQuery<{ subscription: UserSubscription }>({
    queryKey: [API_ENDPOINTS.userSubscription],
  });

  const { data: packages, isLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: [API_ENDPOINTS.publicSubscriptionPackages],
    retry: false,
  });

  const { data: paymentConfig } = useQuery<PaymentConfigResponse>({
    queryKey: [API_ENDPOINTS.paymentConfig],
    retry: false,
  });

  useEffect(() => {
    if (!paymentConfig?.clientKey || !paymentConfig.snapScriptUrl) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${paymentConfig.snapScriptUrl}"]`
    );

    if (existingScript) {
      setIsSnapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = paymentConfig.snapScriptUrl;
    script.async = true;
    script.dataset.clientKey = paymentConfig.clientKey;
    script.onload = () => setIsSnapLoaded(true);
    script.onerror = () => setIsSnapLoaded(false);
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [paymentConfig]);

  const processPaymentMutation = useMutation<MidtransTransactionResponse, Error, number>({
    mutationFn: async (packageId) => {
      const response = await apiRequest('POST', API_ENDPOINTS.paymentProcess, { packageId });
      return response.json();
    },
    onSuccess: (response) => {
      setShowPaymentModal(false);

      const openSnapCheckout = () => {
        if (!window.snap) {
          window.location.href = response.redirectUrl;
          return;
        }

        window.snap.pay(response.token, {
          onSuccess: () => {
            toast({
              title: 'Pembayaran berhasil',
              description: 'Langganan Anda akan diperbarui setelah Midtrans mengonfirmasi pembayaran.',
            });
            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.userSubscription] });
            queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.userSubscriptionLimits] });
          },
          onPending: () => {
            toast({
              title: 'Menunggu pembayaran',
              description: 'Transaksi Anda masih diproses oleh Midtrans.',
            });
          },
          onError: () => {
            toast({
              title: 'Pembayaran gagal',
              description: 'Terjadi kesalahan saat memproses pembayaran. Silakan coba kembali.',
              variant: 'destructive',
            });
          },
          onClose: () => {
            toast({
              title: 'Pembayaran dibatalkan',
              description: 'Anda menutup jendela pembayaran sebelum transaksi selesai.',
            });
          },
        });
      };

      if (isSnapLoaded) {
        openSnapCheckout();
      } else {
        setTimeout(openSnapCheckout, 100);
      }
    },
    onError: (error) => {
      toast({
        title: 'Gagal memulai pembayaran',
        description: error.message || 'Tidak dapat memproses permintaan pembayaran. Coba lagi nanti.',
        variant: 'destructive',
      });
    },
  });

  const handleSelectPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    if (!selectedPackage) {
      return;
    }

    if (!paymentConfig?.isConfigured || !paymentConfig.clientKey) {
      toast({
        title: 'Gateway pembayaran belum siap',
        description: 'Silakan hubungi administrator untuk mengonfigurasi Midtrans.',
        variant: 'destructive',
      });
      return;
    }

    processPaymentMutation.mutate(selectedPackage.id);
  };

  const currentPackage = currentSubscription?.subscription?.package;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="spinner mb-4" />
            <p>Loading subscription plans...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {currentPackage && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Current Subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="default" className="flex items-center space-x-1">
                    {currentPackage.name.toLowerCase().includes('premium') ? (
                      <Crown size={12} />
                    ) : (
                      <Star size={12} />
                    )}
                    <span>{currentPackage.name}</span>
                  </Badge>
                  <span className="text-2xl font-bold">{formatPrice(currentPackage.price)}/bulan</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Next billing: {new Date(currentSubscription.subscription.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={currentSubscription.subscription.status === 'active' ? 'default' : 'secondary'}>
                  {currentSubscription.subscription.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Upgrade your subscription to unlock more features and capabilities
          </p>
        </div>

        {packages && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.filter(pkg => pkg.isActive).map((pkg) => {
              const isCurrentPackage = currentPackage?.id === pkg.id;
              const isDowngrade = currentPackage && parseFloat(pkg.price) < parseFloat(currentPackage.price);

              return (
                <Card
                  key={pkg.id}
                  className={`relative ${
                    pkg.name.toLowerCase().includes('premium')
                      ? 'border-blue-500 shadow-xl'
                      : ''
                  } ${isCurrentPackage ? 'ring-2 ring-green-500' : ''}`}
                >
                  {pkg.name.toLowerCase().includes('premium') && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <Crown size={12} className="mr-1" />
                      Most Popular
                    </Badge>
                  )}

                  {isCurrentPackage && (
                    <Badge
                      variant="default"
                      className="absolute -top-2 right-4 bg-green-500"
                    >
                      Current Plan
                    </Badge>
                  )}

                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {pkg.name.toLowerCase().includes('premium') ? (
                        <Crown className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <Star className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {formatPrice(pkg.price)}
                      <span className="text-base font-normal text-gray-500">/bulan</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{pkg.description}</p>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      <li className="flex items-center space-x-2">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm">
                          {pkg.maxWorkspaces === -1 ? 'Unlimited' : pkg.maxWorkspaces} Workspace{pkg.maxWorkspaces !== 1 ? 's' : ''}
                        </span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm">
                          {pkg.maxMembers === -1 ? 'Unlimited' : pkg.maxMembers} Team Member{pkg.maxMembers !== 1 ? 's' : ''}
                        </span>
                      </li>
                    </ul>

                    <Button
                      className={`w-full ${
                        pkg.name.toLowerCase().includes('premium')
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : ''
                      }`}
                      variant={
                        isCurrentPackage
                          ? 'secondary'
                          : pkg.name.toLowerCase().includes('premium')
                            ? 'default'
                            : 'outline'
                      }
                      disabled={isCurrentPackage}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      {isCurrentPackage ? (
                        'Current Plan'
                      ) : isDowngrade ? (
                        <>Downgrade to {pkg.name}</>
                      ) : (
                        <>
                          {pkg.name.toLowerCase().includes('premium') ? 'Upgrade' : 'Choose'} {pkg.name}
                          <ArrowRight size={16} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Konfirmasi Pembayaran</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-5">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedPackage.name} Plan</p>
                      <p className="text-sm text-gray-500">Langganan bulanan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatPrice(selectedPackage.price)}</p>
                      <p className="text-xs text-gray-500">/bulan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium">Pembayaran diproses melalui Midtrans Snap.</p>
                <p className="mt-2">
                  Anda akan diarahkan ke halaman Midtrans untuk menyelesaikan pembayaran dengan aman. Setelah selesai, status langganan akan diperbarui secara otomatis.
                </p>
                {!isSnapLoaded && (
                  <p className="mt-2 text-xs text-slate-500">
                    Menyiapkan Midtrans Snap... jika tidak terbuka otomatis, kami akan mengarahkan Anda ke halaman pembayaran.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                  Batal
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={processPaymentMutation.isPending}
                >
                  {processPaymentMutation.isPending ? 'Memproses...' : `Bayar ${formatPrice(selectedPackage.price)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
