import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission, 
  requiredRole 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { hasPermission, hasRole, isRoot, isLoading } = usePermissions();

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  // Root user has access to everything
  if (isRoot()) {
    return <>{children}</>;
  }

  // Check required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check required role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have the required role to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}