import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import { PermissionsProvider } from "./lib/permissions.tsx";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Accounts from "@/pages/accounts";
import Categories from "@/pages/categories";
import Transactions from "@/pages/transactions";
import Budget from "@/pages/budget";
import Reports from "@/pages/reports";
import Debts from "@/pages/debts";
import Collaboration from "@/pages/collaboration";
import UsersManagement from "@/pages/users";
import RolesManagement from "@/pages/roles";
import SubscriptionPackagesManagement from './pages/subscription-packages';
import SubscriptionPage from './pages/subscription';
import ProfilePage from './pages/profile';
import SettingsPage from './pages/settings';
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { TransactionFAB } from "@/components/ui/floating-action-button";
import AddTransactionModal from "@/components/modals/add-transaction-modal";
import AddAccountModal from "@/components/modals/add-account-modal";
import AddDebtModal from "@/components/modals/add-debt-modal";

function AppRouter() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);

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
    return <Login />;
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
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-6">
          <Switch>
            <Route path="/" component={() => <Dashboard workspaceId={currentWorkspace?.id} />} />
            <Route path="/dashboard" component={() => <Dashboard workspaceId={currentWorkspace?.id} />} />
            <Route path="/accounts" component={() => <Accounts workspaceId={currentWorkspace?.id} />} />
            <Route path="/categories" component={() => <Categories workspaceId={currentWorkspace?.id} />} />
            <Route path="/transactions" component={() => <Transactions workspaceId={currentWorkspace?.id} />} />
            <Route path="/budget" component={() => <Budget workspaceId={currentWorkspace?.id} />} />
            <Route path="/reports" component={() => <Reports workspaceId={currentWorkspace?.id} />} />
            <Route path="/debts" component={() => <Debts workspaceId={currentWorkspace?.id} />} />
            <Route path="/collaboration" component={() => <Collaboration workspaceId={currentWorkspace?.id} />} />
            
            {/* Role Root specific menu */}
            {user.role === 'root' && (
              <>
                <Route path="/users" component={UsersManagement} />
                <Route path="/roles" component={RolesManagement} />
                <Route path="/subscription-packages" component={() => 
                  <ProtectedRoute>
                    <SubscriptionPackagesManagement />
                  </ProtectedRoute>
                } />
              </>
            )}

            <Route path="/subscription" component={() => 
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" component={ProfilePage} />
            <Route path="/settings" component={() => 
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route component={NotFound} />
          </Switch>
        </main>

        {/* Floating Action Button */}
        <TransactionFAB
          onAddTransaction={() => setShowTransactionModal(true)}
          onAddAccount={() => setShowAccountModal(true)}
          onAddDebt={() => setShowDebtModal(true)}
          className="fixed bottom-4 right-4 z-40"
        />

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
          <PermissionsProvider>
            <AppRouter />
            <Toaster />
          </PermissionsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;