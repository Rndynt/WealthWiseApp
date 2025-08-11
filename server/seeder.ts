import { db } from "./db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  subscriptionPackages, 
  users, 
  userSubscriptions,
  workspaces,
  categories,
  accounts
} from "@shared/schema";
import bcrypt from "bcrypt";

async function seedRoles() {
  console.log("Seeding roles...");
  
  await db.insert(roles).values([
    { id: 1, name: "root", description: "Super administrator dengan akses penuh sistem" },
    { id: 2, name: "admin", description: "Administrator dengan akses manajemen user dan sistem" },
    { id: 3, name: "user", description: "User biasa dengan akses terbatas" },
  ]).onConflictDoNothing();
}

async function seedPermissions() {
  console.log("Seeding permissions...");
  
  const permissionList = [
    // User management
    { name: "users.view", description: "Mengakses halaman manajemen user", resource: "users", action: "view" },
    { name: "users.create", description: "Membuat user baru", resource: "users", action: "create" },
    { name: "users.read", description: "Melihat data user", resource: "users", action: "read" },
    { name: "users.update", description: "Mengupdate data user", resource: "users", action: "update" },
    { name: "users.delete", description: "Menghapus user", resource: "users", action: "delete" },
    
    // Role management
    { name: "roles.view", description: "Mengakses halaman manajemen role", resource: "roles", action: "view" },
    { name: "roles.create", description: "Membuat role baru", resource: "roles", action: "create" },
    { name: "roles.read", description: "Melihat data role", resource: "roles", action: "read" },
    { name: "roles.update", description: "Mengupdate role", resource: "roles", action: "update" },
    { name: "roles.delete", description: "Menghapus role", resource: "roles", action: "delete" },
    
    // Permission management
    { name: "permissions.view", description: "Mengakses halaman manajemen permission", resource: "permissions", action: "view" },
    { name: "permissions.read", description: "Melihat data permission", resource: "permissions", action: "read" },
    
    // Subscription management
    { name: "subscriptions.view", description: "Mengakses halaman paket langganan", resource: "subscriptions", action: "view" },
    { name: "subscriptions.create", description: "Membuat paket langganan", resource: "subscriptions", action: "create" },
    { name: "subscriptions.read", description: "Melihat paket langganan", resource: "subscriptions", action: "read" },
    { name: "subscriptions.update", description: "Mengupdate paket langganan", resource: "subscriptions", action: "update" },
    { name: "subscriptions.delete", description: "Menghapus paket langganan", resource: "subscriptions", action: "delete" },
    
    // Workspace management
    { name: "workspaces.view", description: "Mengakses halaman workspace", resource: "workspaces", action: "view" },
    { name: "workspaces.create", description: "Membuat workspace", resource: "workspaces", action: "create" },
    { name: "workspaces.read", description: "Melihat workspace", resource: "workspaces", action: "read" },
    { name: "workspaces.update", description: "Mengupdate workspace", resource: "workspaces", action: "update" },
    { name: "workspaces.delete", description: "Menghapus workspace", resource: "workspaces", action: "delete" },
    
    // Financial data - Transactions
    { name: "transactions.view", description: "Mengakses halaman transaksi", resource: "transactions", action: "view" },
    { name: "transactions.create", description: "Membuat transaksi", resource: "transactions", action: "create" },
    { name: "transactions.read", description: "Melihat transaksi", resource: "transactions", action: "read" },
    { name: "transactions.update", description: "Mengupdate transaksi", resource: "transactions", action: "update" },
    { name: "transactions.delete", description: "Menghapus transaksi", resource: "transactions", action: "delete" },
    
    // Budget management
    { name: "budgets.view", description: "Mengakses halaman budget", resource: "budgets", action: "view" },
    { name: "budgets.create", description: "Membuat budget", resource: "budgets", action: "create" },
    { name: "budgets.read", description: "Melihat budget", resource: "budgets", action: "read" },
    { name: "budgets.update", description: "Mengupdate budget", resource: "budgets", action: "update" },
    { name: "budgets.delete", description: "Menghapus budget", resource: "budgets", action: "delete" },
    
    // Debt management
    { name: "debts.view", description: "Mengakses halaman hutang", resource: "debts", action: "view" },
    { name: "debts.create", description: "Membuat data hutang", resource: "debts", action: "create" },
    { name: "debts.read", description: "Melihat data hutang", resource: "debts", action: "read" },
    { name: "debts.update", description: "Mengupdate data hutang", resource: "debts", action: "update" },
    { name: "debts.delete", description: "Menghapus data hutang", resource: "debts", action: "delete" },
    
    // Account management
    { name: "accounts.view", description: "Mengakses halaman akun", resource: "accounts", action: "view" },
    { name: "accounts.create", description: "Membuat akun", resource: "accounts", action: "create" },
    { name: "accounts.read", description: "Melihat akun", resource: "accounts", action: "read" },
    { name: "accounts.update", description: "Mengupdate akun", resource: "accounts", action: "update" },
    { name: "accounts.delete", description: "Menghapus akun", resource: "accounts", action: "delete" },
    
    // Category management
    { name: "categories.view", description: "Mengakses halaman kategori", resource: "categories", action: "view" },
    { name: "categories.create", description: "Membuat kategori", resource: "categories", action: "create" },
    { name: "categories.read", description: "Melihat kategori", resource: "categories", action: "read" },
    { name: "categories.update", description: "Mengupdate kategori", resource: "categories", action: "update" },
    { name: "categories.delete", description: "Menghapus kategori", resource: "categories", action: "delete" },
    
    // Reports
    { name: "reports.view", description: "Mengakses halaman laporan", resource: "reports", action: "view" },
    { name: "reports.read", description: "Melihat laporan", resource: "reports", action: "read" },
    { name: "reports.export", description: "Export laporan", resource: "reports", action: "export" },
    
    // Collaboration
    { name: "collaboration.view", description: "Mengakses halaman kolaborasi", resource: "collaboration", action: "view" },
    { name: "collaboration.manage", description: "Mengelola anggota workspace", resource: "collaboration", action: "manage" },
    
    // Dashboard
    { name: "dashboard.view", description: "Mengakses dashboard", resource: "dashboard", action: "view" },
  ];
  
  await db.insert(permissions).values(permissionList).onConflictDoNothing();
}

async function seedRolePermissions() {
  console.log("Seeding role permissions...");
  
  // Get all permissions
  const allPermissions = await db.select().from(permissions);
  
  // Root permissions (all permissions)
  const rootPermissions = allPermissions.map(permission => ({
    roleId: 1,
    permissionId: permission.id
  }));
  
  // Admin permissions (all except role management)
  const adminPermissions = allPermissions
    .filter(permission => !permission.name.startsWith("roles."))
    .map(permission => ({
      roleId: 2,
      permissionId: permission.id
    }));
  
  // User permissions (basic financial operations)
  const userPermissions = allPermissions
    .filter(permission => 
      permission.name.includes("workspaces.") ||
      permission.name.includes("transactions.") ||
      permission.name.includes("budgets.") ||
      permission.name.includes("debts.") ||
      permission.name.includes("accounts.") ||
      permission.name.includes("categories.") ||
      permission.name.includes("reports.")
    )
    .map(permission => ({
      roleId: 3,
      permissionId: permission.id
    }));
  
  await db.insert(rolePermissions).values([
    ...rootPermissions,
    ...adminPermissions,
    ...userPermissions
  ]).onConflictDoNothing();
}

async function seedSubscriptionPackages() {
  console.log("Seeding subscription packages...");
  
  await db.insert(subscriptionPackages).values([
    {
      id: 1,
      name: "basic",
      price: "0.00",
      features: [
        "1 workspace pribadi",
        "Unlimited transaksi",
        "Budget tracking",
        "Laporan dasar",
        "Export PDF"
      ],
      maxWorkspaces: 1,
      maxMembers: 1,
      description: "Paket gratis untuk pengelolaan keuangan pribadi",
      isActive: true
    },
    {
      id: 2,
      name: "premium",
      price: "99000.00",
      features: [
        "5 workspace",
        "Kolaborasi hingga 10 anggota",
        "Unlimited transaksi",
        "Advanced budget tracking",
        "Debt & credit management",
        "Advanced reports & analytics",
        "Export ke Excel & CSV",
        "Priority support",
        "Backup otomatis"
      ],
      maxWorkspaces: 5,
      maxMembers: 10,
      description: "Paket premium untuk keluarga dan bisnis kecil",
      isActive: true
    }
  ]).onConflictDoNothing();
}

async function seedUsers() {
  console.log("Seeding users...");
  
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const demoPassword = await bcrypt.hash("demo123", 10);
  
  await db.insert(users).values([
    {
      id: 1,
      email: "root@financeflow.com",
      password: hashedPassword,
      name: "Root Administrator",
      roleId: 1
    },
    {
      id: 2,
      email: "admin@financeflow.com",
      password: hashedPassword,
      name: "System Administrator",
      roleId: 2
    },
    {
      id: 3,
      email: "demo@financeflow.com",
      password: demoPassword,
      name: "Demo User",
      roleId: 3
    },
    {
      id: 4,
      email: "user1@financeflow.com",
      password: demoPassword,
      name: "John Doe",
      roleId: 3
    },
    {
      id: 5,
      email: "user2@financeflow.com",
      password: demoPassword,
      name: "Jane Smith",
      roleId: 3
    }
  ]).onConflictDoNothing();
}

async function seedUserSubscriptions() {
  console.log("Seeding user subscriptions...");
  
  const now = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(now.getFullYear() + 1);
  
  await db.insert(userSubscriptions).values([
    {
      userId: 1,
      packageId: 2, // Premium for root
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 2,
      packageId: 2, // Premium for admin
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 3,
      packageId: 1, // Basic for demo user
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 4,
      packageId: 2, // Premium for user1
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 5,
      packageId: 1, // Basic for user2
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    }
  ]).onConflictDoNothing();
}

async function seedWorkspaces() {
  console.log("Seeding workspaces...");
  
  await db.insert(workspaces).values([
    {
      id: 1,
      name: "Personal Finance",
      type: "personal",
      ownerId: 3
    },
    {
      id: 2,
      name: "Family Budget",
      type: "family",
      ownerId: 4
    },
    {
      id: 3,
      name: "Small Business",
      type: "business",
      ownerId: 4
    }
  ]).onConflictDoNothing();
}

async function seedCategories() {
  console.log("Seeding categories...");
  
  await db.insert(categories).values([
    // Income categories for workspace 1
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 1 },
    { name: "Freelance", type: "income", icon: "💻", description: "Pendapatan freelance", workspaceId: 1 },
    { name: "Investasi", type: "income", icon: "📈", description: "Hasil investasi", workspaceId: 1 },
    
    // Needs categories for workspace 1
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 1 },
    { name: "Transportasi", type: "needs", icon: "🚗", description: "Biaya transportasi", workspaceId: 1 },
    { name: "Listrik", type: "needs", icon: "⚡", description: "Tagihan listrik", workspaceId: 1 },
    { name: "Internet", type: "needs", icon: "🌐", description: "Tagihan internet", workspaceId: 1 },
    
    // Wants categories for workspace 1
    { name: "Hiburan", type: "wants", icon: "🎬", description: "Pengeluaran hiburan", workspaceId: 1 },
    { name: "Shopping", type: "wants", icon: "🛍️", description: "Belanja non-essential", workspaceId: 1 },
    { name: "Liburan", type: "wants", icon: "✈️", description: "Biaya liburan", workspaceId: 1 },
    
    // Categories for workspace 2 (Family)
    { name: "Gaji Suami", type: "income", icon: "💰", description: "Pendapatan suami", workspaceId: 2 },
    { name: "Gaji Istri", type: "income", icon: "💰", description: "Pendapatan istri", workspaceId: 2 },
    { name: "Belanja Bulanan", type: "needs", icon: "🛒", description: "Belanja kebutuhan bulanan", workspaceId: 2 },
    { name: "Pendidikan Anak", type: "needs", icon: "🎓", description: "Biaya pendidikan", workspaceId: 2 },
    { name: "Kesehatan", type: "needs", icon: "🏥", description: "Biaya kesehatan", workspaceId: 2 },
    
    // Categories for workspace 3 (Business)
    { name: "Penjualan", type: "income", icon: "💵", description: "Pendapatan penjualan", workspaceId: 3 },
    { name: "Operasional", type: "needs", icon: "⚙️", description: "Biaya operasional", workspaceId: 3 },
    { name: "Marketing", type: "wants", icon: "📢", description: "Biaya marketing", workspaceId: 3 },
  ]).onConflictDoNothing();
}

async function seedAccounts() {
  console.log("Seeding accounts...");
  
  await db.insert(accounts).values([
    // Accounts for workspace 1
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 1 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 1 },
    { name: "E-Wallet", type: "transaction", currency: "IDR", workspaceId: 1 },
    { name: "Tabungan", type: "asset", currency: "IDR", workspaceId: 1 },
    
    // Accounts for workspace 2
    { name: "Rekening Keluarga", type: "transaction", currency: "IDR", workspaceId: 2 },
    { name: "Kas Kecil", type: "transaction", currency: "IDR", workspaceId: 2 },
    { name: "Tabungan Anak", type: "asset", currency: "IDR", workspaceId: 2 },
    
    // Accounts for workspace 3
    { name: "Rekening Bisnis", type: "transaction", currency: "IDR", workspaceId: 3 },
    { name: "Petty Cash", type: "transaction", currency: "IDR", workspaceId: 3 },
    { name: "Investasi", type: "asset", currency: "IDR", workspaceId: 3 },
  ]).onConflictDoNothing();
}

export async function runSeeder() {
  try {
    console.log("Starting database seeding...");
    
    await seedRoles();
    await seedPermissions();
    await seedRolePermissions();
    await seedSubscriptionPackages();
    await seedUsers();
    await seedUserSubscriptions();
    await seedWorkspaces();
    await seedCategories();
    await seedAccounts();
    
    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder()
    .then(() => {
      console.log("Seeder finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeder failed:", error);
      process.exit(1);
    });
}