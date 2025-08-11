# LOGIN CREDENTIALS - FinanceFlow

## Informasi Login untuk Testing

### 1. Root Administrator (Super Admin)
- **Email**: `root@financeflow.com`
- **Password**: `admin123`
- **Role**: Root - Akses penuh ke semua fitur sistem
- **Permissions**: Semua permission tersedia
- **Workspace Limit**: Unlimited (Premium package)

### 2. System Administrator 
- **Email**: `admin@financeflow.com`
- **Password**: `admin123`
- **Role**: Admin - Manajemen user dan sistem
- **Permissions**: User management, role management, subscription management
- **Workspace Limit**: Unlimited (Premium package)

### 3. Demo User (User Basic)
- **Email**: `demo@financeflow.com`
- **Password**: `demo123`
- **Role**: User Basic - Akses terbatas
- **Permissions**: Hanya akses ke workspace pribadi
- **Workspace Limit**: 1 workspace (Basic package)
- **Data**: Sudah memiliki workspace "Personal Finance" dengan contoh data

### 4. User Premium Test
- **Email**: `user1@financeflow.com`
- **Password**: `demo123`
- **Role**: User Basic dengan Premium subscription
- **Workspace Limit**: 5 workspace (Premium package)

### 5. User Basic Test
- **Email**: `user2@financeflow.com`
- **Password**: `demo123`
- **Role**: User Basic
- **Workspace Limit**: 1 workspace (Basic package)

## Status Implementasi Permission System

✅ **Backend Protection Implemented**:
- User Management routes: `requirePermission('users.read')`, `requirePermission('users.update')`
- Role Management routes: `requirePermission('roles.read')`, `requirePermission('roles.create')`
- Subscription Management routes: `requirePermission('subscriptions.read')`
- Middleware `requirePermission()` dan `requireRole()` sudah dibuat

✅ **Permission API Endpoints**:
- `GET /api/user/permissions` - Mendapatkan permissions user
- Permission validation di setiap protected route

✅ **Frontend Protection Available**:
- Hook `usePermissions()` untuk cek permission
- Component `ProtectedRoute` untuk protect pages
- Component `PermissionGate` dan `RoleGate` untuk conditional rendering
- Higher-order components `withPermission()` dan `withRole()`

## Cara Test Permission System

1. **Login sebagai demo user** - Coba akses halaman admin (akan ditolak)
2. **Login sebagai admin** - Akses user management, role management (berhasil)
3. **Login sebagai root** - Akses semua fitur (berhasil)

## Subscription Limits Testing

1. **User Basic (demo)** - Coba buat workspace ke-2 (akan ditolak dengan pesan Indonesia)
2. **User Premium** - Bisa buat hingga 5 workspace
3. **Interface** - Semua dalam bahasa Indonesia dengan notifikasi yang jelas

## Database Seeding Status

✅ **Completed**: Database sudah di-seed dengan semua data demo termasuk:
- Users dengan roles yang benar
- Subscription packages (basic & premium)  
- User subscriptions yang aktif
- Workspace demo dengan data lengkap
- Permissions dan role permissions