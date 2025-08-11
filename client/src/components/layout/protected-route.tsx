import React from 'react';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'root' | 'admin' | 'user';
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const { user } = useAuth();

  // Simple role check based on user ID
  const hasAccess = () => {
    if (!user || !requiredRole) return true;
    
    // Root user (ID 1) has access to everything
    if (user.id === 1) return true;
    
    // Admin user (ID 2) has access to admin and user routes
    if (user.id === 2 && ['admin', 'user'].includes(requiredRole)) return true;
    
    // Regular users (ID > 2) only have access to user routes
    if (user.id > 2 && requiredRole === 'user') return true;
    
    return false;
  };

  if (!hasAccess()) {
    return (
      fallback || (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Akses Ditolak
            </h3>
            <p className="text-gray-600">
              Anda tidak memiliki akses untuk melihat halaman ini.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}