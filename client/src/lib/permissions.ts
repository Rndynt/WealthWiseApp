import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { User } from '@shared/schema';

// Hook untuk mengecek permission user
export function usePermissions() {
  const { user } = useAuth();
  
  const { data: permissions = [] } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasRole = (roleName: string) => {
    if (!user) return false;
    
    // Simple role check based on user ID for now
    // Root user (ID 1)
    if (user.id === 1) return ['root'].includes(roleName);
    // Admin user (ID 2)  
    if (user.id === 2) return ['admin', 'user'].includes(roleName);
    // Regular users (ID > 2)
    return ['user'].includes(roleName);
  };

  const isRoot = () => hasRole('root');
  const isAdmin = () => hasRole('admin');
  const isUser = () => hasRole('user');

  return {
    permissions,
    hasPermission,
    hasRole,
    isRoot,
    isAdmin, 
    isUser
  };
}

// Higher-order component untuk protect routes berdasarkan permission
export function withPermission(permission: string) {
  return function<T extends {}>(Component: React.ComponentType<T>) {
    return function PermissionWrapper(props: T) {
      const { hasPermission } = usePermissions();
      
      if (!hasPermission(permission)) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Akses Ditolak
              </h3>
              <p className="text-gray-600">
                Anda tidak memiliki permission untuk mengakses halaman ini.
              </p>
            </div>
          </div>
        );
      }

      return <Component {...props} />;
    };
  };
}

// Higher-order component untuk protect routes berdasarkan role
export function withRole(roleName: string) {
  return function<T extends {}>(Component: React.ComponentType<T>) {
    return function RoleWrapper(props: T) {
      const { hasRole } = usePermissions();
      
      if (!hasRole(roleName)) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Akses Ditolak
              </h3>
              <p className="text-gray-600">
                Anda tidak memiliki role {roleName} untuk mengakses halaman ini.
              </p>
            </div>
          </div>
        );
      }

      return <Component {...props} />;
    };
  };
}

// Component untuk conditional rendering berdasarkan permission
export function PermissionGate({ 
  permission, 
  children, 
  fallback = null 
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Component untuk conditional rendering berdasarkan role
export function RoleGate({ 
  role, 
  children, 
  fallback = null 
}: {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasRole } = usePermissions();
  
  if (!hasRole(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}