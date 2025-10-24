import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Crown, 
  Star, 
  CheckCircle, 
  CreditCard, 
  Calendar,
  Shield,
  Zap,
  ArrowRight
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';

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
  userId: number;
  packageId: number;
  startDate: string;
  endDate: string;
  status: string;
  package: SubscriptionPackage;
}

interface PaymentData {
  packageId: number;
  paymentMethod: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolder: string;
  billingCycle: string;
}

export default function UpgradePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    packageId: 0,
    paymentMethod: 'credit_card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: '',
    billingCycle: 'monthly'
  });

  // Formatter harga IDR
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Gratis' : `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Fetch current user subscription
  const { data: currentSubscription } = useQuery<{ subscription: UserSubscription }>({
    queryKey: ['/api/user/subscription'],
  });

  // Fetch available packages
  const { data: packages, isLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/subscription-packages'],
    retry: false,
  });

  // Payment processing mutation
  const processPAymentMutation = useMutation({
    mutationFn: (data: PaymentData) =>
      apiRequest('/api/payment/process', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/subscription'] });
      setShowPaymentModal(false);
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been upgraded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    setPaymentData(prev => ({ ...prev, packageId: pkg.id }));
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    if (!selectedPackage) return;

    // Validate payment data
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardHolder) {
      toast({
        title: "Missing Information",
        description: "Please fill in all payment details.",
        variant: "destructive",
      });
      return;
    }

    processPAymentMutation.mutate(paymentData);
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
      {/* Current Subscription */}
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

      {/* Available Packages */}
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

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Details</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected Package Info */}
            {selectedPackage && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedPackage.name} Plan</p>
                      <p className="text-sm text-gray-500">Monthly subscription</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatPrice(selectedPackage.price)}</p>
                      <p className="text-xs text-gray-500">/bulan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Cycle */}
            <div>
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select
                value={paymentData.billingCycle}
                onValueChange={(value) => setPaymentData(prev => ({ ...prev, billingCycle: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (2 months free!)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardHolder">Card Holder Name</Label>
                <Input
                  id="cardHolder"
                  value={paymentData.cardHolder}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cardHolder: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    value={paymentData.expiryDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    value={paymentData.cvv}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, cvv: e.target.value }))}
                    placeholder="123"
                    maxLength={3}
                  />
                </div>
              </div>
            </div>

            {/* Demo Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                <Zap size={16} />
                <p className="text-sm font-medium">Demo Mode</p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This is a demo payment system. No real charges will be made. Use any test card details.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayment}
                disabled={processPAymentMutation.isPending}
              >
                {processPAymentMutation.isPending ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard size={16} className="mr-2" />
                    Pay {selectedPackage ? formatPrice(selectedPackage.price) : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}