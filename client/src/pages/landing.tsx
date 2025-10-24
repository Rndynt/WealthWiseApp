import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  ArrowRight, 
  CheckCircle, 
  DollarSign, 
  BarChart3, 
  Shield, 
  Users,
  Star,
  Crown,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubscriptionPackage {
  id: number;
  name: string;
  price: string;
  features: string[];
  maxWorkspaces: number;
  maxMembers: number;
  type: string;
  description: string;
  isActive: boolean;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Tambah toggle siklus penagihan untuk pricing section
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: packages } = useQuery<SubscriptionPackage[]>({
    queryKey: ['/api/public/subscription-packages'],
    retry: false,
  });

  // Formatter harga IDR
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Gratis' : `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Total tahunan dengan promo hemat 2 bulan (bayar 10x harga bulanan)
  const formatYearlyTotal = (price: string) => {
    const monthly = parseFloat(price);
    if (monthly === 0) return 'Gratis';
    const total = monthly * 10;
    return `Rp ${total.toLocaleString('id-ID')}`;
  };

  const features = [
    {
      icon: DollarSign,
      title: "Transaction Tracking",
      description: "Track all your income and expenses across multiple accounts"
    },
    {
      icon: BarChart3,
      title: "Financial Reports",
      description: "Generate detailed reports and visualize your financial data"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data is encrypted and secure"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Bagikan workspace shared dan berkolaborasi dengan tim atau keluarga"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">FinanceFlow</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Home</a>
              <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">About</a>
              <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Pricing</a>
              <a href="#help" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Help</a>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="flex flex-col space-y-4">
                <a href="#home" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Home</a>
                <a href="#about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">About</a>
                <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Pricing</a>
                <a href="#help" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Help</a>
                <Link href="/login">
                  <Button className="w-full">Login</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Take Control of Your <span className="text-blue-600">Finances</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            FinanceFlow is a comprehensive personal finance management system that helps you track expenses,
            manage budgets, and achieve your financial goals with intelligent insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="flex items-center space-x-2">
                <span>Get Started</span>
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              <a href="#about">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose FinanceFlow?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Powerful features to help you manage your finances like a pro
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Start free and upgrade as you grow
            </p>
            {/* Toggle bulanan/tahunan */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center p-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Bulanan
                </button>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Tahunan
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Hemat 2 bulan</span>
                </button>
              </div>
            </div>
          </div>

          {packages && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {packages.filter(pkg => pkg.isActive).map((pkg) => (
                <Card key={pkg.id} className={`relative transition-transform hover:-translate-y-1 hover:shadow-2xl ${pkg.name.toLowerCase() === 'premium' ? 'border-blue-500 shadow-xl ring-2 ring-blue-200' : 'border border-gray-200 dark:border-gray-700'}`}>
                  {pkg.name.toLowerCase() === 'premium' && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <Crown size={12} className="mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {pkg.name.toLowerCase() === 'premium' ? (
                        <Crown className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <Star className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {formatPrice(pkg.price)}
                      <span className="text-base font-normal text-gray-500">/bulan</span>
                    </div>
                    {billingCycle === 'yearly' && parseFloat(pkg.price) > 0 && (
                      <div className="text-sm text-green-600 mt-1">
                        Dibayar tahunan: <span className="font-semibold">{formatYearlyTotal(pkg.price)}</span>
                        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Hemat 2 bulan</Badge>
                      </div>
                    )}
                    <p className="text-gray-600 dark:text-gray-300">{pkg.description}</p>
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
                    
                    <Link href="/login">
                      <Button 
                        className={`w-full ${pkg.name.toLowerCase() === 'premium' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={pkg.name.toLowerCase() === 'premium' ? 'default' : 'outline'}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section id="help" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Need Help Getting Started?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Comprehensive guides and tutorials to help you get the most out of FinanceFlow.
                </p>
                <Button variant="outline" className="w-full">
                  View Docs
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Get help from our support team whenever you need assistance.
                </p>
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Ready to transform your financial management?
            </p>
            <Link href="/login">
              <Button size="lg" className="flex items-center space-x-2 mx-auto">
                <span>Start Your Journey</span>
                <ArrowRight size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <DollarSign className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">FinanceFlow</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              © 2025 FinanceFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}