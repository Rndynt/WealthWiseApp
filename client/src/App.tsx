import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { EnhancedPermissionsProvider } from "./lib/enhanced-permissions";
import Login from "@/pages/login";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ComprehensiveDashboard from "@/pages/comprehensive-dashboard";
import Accounts from "@/pages/accounts";
import Categories from "@/pages/categories";
import Transactions from "@/pages/transactions";
import Budget from "@/pages/budget";
import Reports from "@/pages/reports";
import Analytics from "@/pages/analytics";
import EnhancedGoalsPage from './pages/enhanced-goals'; // Use the advanced Enhanced Goals component
import Automation from "@/pages/automation";
import Debts from "@/pages/debts";
import Collaboration from "@/pages/collaboration";
import UsersManagement from "@/pages/users";
import RolesManagement from "@/pages/roles";
import SubscriptionPackagesManagement from './pages/subscription-packages';
import UserSubscriptionsManagement from './pages/user-subscriptions';
import SubscriptionPage from './pages/subscription';
import Notifications from './pages/notifications';
import UpgradePage from './pages/upgrade';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/layout/protected-route";
import { useLocation } from "wouter";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { EnhancedPullToRefresh } from "@/components/enhanced-pull-to-refresh";

import AddTransactionModal from "@/components/modals/add-transaction-modal";
import AddAccountModal from "@/components/modals/add-account-modal";
import AddDebtModal from "@/components/modals/add-debt-modal";

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function AppRouter() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentWorkspace={currentWorkspace}
        onWorkspaceChange={setCurrentWorkspace}
      />

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onDateRangeChange={setDateRange}
          currentDateRange={dateRange}
        />

        <EnhancedPullToRefresh onRefresh={() => window.location.reload()}>
          <main className="p-4 sm:p-6">
            <Switch>
              <Route path="/" component={() => <ComprehensiveDashboard workspaceId={currentWorkspace?.id} />} />
              <Route path="/dashboard" component={() => <ComprehensiveDashboard workspaceId={currentWorkspace?.id} />} />
              <Route path="/accounts" component={() => <Accounts workspaceId={currentWorkspace?.id} />} />
              <Route path="/categories" component={() => <Categories workspaceId={currentWorkspace?.id} />} />
              <Route path="/transactions" component={() => <Transactions workspaceId={currentWorkspace?.id} dateRange={dateRange} />} />
              <Route path="/budget" component={() => <Budget workspaceId={currentWorkspace?.id} />} />
              <Route path="/reports" component={() => <Reports workspaceId={currentWorkspace?.id} />} />
              <Route path="/analytics" component={() => <Analytics workspaceId={currentWorkspace?.id} />} />
              {/* The original route for goals */}
              <Route path="/goals">
                {currentWorkspace?.id ? <EnhancedGoalsPage workspaceId={currentWorkspace.id} /> : <div>Please select a workspace</div>}
              </Route>
              <Route path="/enhanced-goals">
                {currentWorkspace?.id ? <EnhancedGoalsPage workspaceId={currentWorkspace.id} /> : <div>Please select a workspace</div>}
              </Route>
              <Route path="/automation" component={() => <Automation workspaceId={currentWorkspace?.id} />} />
              <Route path="/debts" component={() => <Debts workspaceId={currentWorkspace?.id} />} />
              <Route path="/collaboration" component={() => 
                <ProtectedRoute requiredPermission="user.collaboration.pages">
                  <Collaboration workspaceId={currentWorkspace?.id} />
                </ProtectedRoute>
              } />
            {/* Redirect '/login' to '/dashboard' when authenticated */}
            <Route path="/login" component={() => <Redirect to="/dashboard" />} />

            {/* Management Routes - Protected by permissions */}
            <Route path="/users" component={() => 
              <ProtectedRoute>
                <UsersManagement />
              </ProtectedRoute>
            } />
            <Route path="/roles" component={() => 
              <ProtectedRoute>
                <RolesManagement />
              </ProtectedRoute>
            } />
            <Route path="/subscription-packages" component={() => 
              <ProtectedRoute>
                <SubscriptionPackagesManagement />
              </ProtectedRoute>
            } />
            {/* New route for user subscriptions management */}
            <Route path="/user-subscriptions" component={() =>
              <ProtectedRoute>
                <UserSubscriptionsManagement />
              </ProtectedRoute>
            } />

            <Route path="/subscription" component={() => 
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            } />
            <Route path="/upgrade" component={() => 
              <ProtectedRoute>
                <UpgradePage />
              </ProtectedRoute>
            } />

            <Route path="/profile" component={ProfilePage} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={() => 
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route component={NotFound} />
            </Switch>
          </main>
        </EnhancedPullToRefresh>

        {/* Modals */}
        <AddTransactionModal 
          open={showTransactionModal} 
          onOpenChange={setShowTransactionModal}
          workspaceId={currentWorkspace?.id}
        />
        <AddAccountModal 
          open={showAccountModal} 
          onOpenChange={setShowAccountModal}
          workspaceId={currentWorkspace?.id}
        />
        <AddDebtModal 
          open={showDebtModal} 
          onOpenChange={setShowDebtModal}
          workspaceId={currentWorkspace?.id}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <EnhancedPermissionsProvider>
            <AppRouter />
            <Toaster />
            <PWAInstallButton />

          </EnhancedPermissionsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;