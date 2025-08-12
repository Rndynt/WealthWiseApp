import { db } from "./db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  subscriptionPackages, 
  users, 
  userSubscriptions,
  workspaces,
  workspaceMembers,
  categories,
  accounts,
  transactions,
  budgets,
  debts
} from "@shared/schema";
import bcrypt from "bcrypt";

async function resetDatabase() {
  console.log("Resetting database...");
  
  // Hapus data dalam urutan yang benar (mengikuti foreign key constraints)
  await db.delete(transactions);
  await db.delete(budgets);  
  await db.delete(debts);
  await db.delete(accounts);
  await db.delete(categories);
  await db.delete(workspaceMembers);
  await db.delete(workspaces);
  await db.delete(userSubscriptions);
  await db.delete(users);
  await db.delete(subscriptionPackages);
  await db.delete(rolePermissions);
  await db.delete(permissions);
  await db.delete(roles);
  
  console.log("Database reset completed!");
}

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
    { name: "collaboration.owner", description: "Owner penuh atas workspace kolaborasi", resource: "collaboration", action: "owner" },
    { name: "collaboration.edit_own", description: "Edit transaksi sendiri di workspace kolaborasi", resource: "collaboration", action: "edit_own" },
    { name: "collaboration.edit_all", description: "Edit semua transaksi di workspace kolaborasi", resource: "collaboration", action: "edit_all" },
    
    // Dashboard
    { name: "dashboard.view", description: "Mengakses dashboard", resource: "dashboard", action: "view" },
  ];
  
  await db.insert(permissions).values(permissionList).onConflictDoNothing();
}

async function seedRolePermissions() {
  console.log("Seeding role permissions...");
  
  // Clear existing role permissions first to avoid duplicates
  await db.delete(rolePermissions);
  
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
      permission.name.includes("reports.") ||
      permission.name.includes("dashboard.") ||
      permission.name.includes("collaboration.")
    )
    .map(permission => ({
      roleId: 3,
      permissionId: permission.id
    }));
  
  await db.insert(rolePermissions).values([
    ...rootPermissions,
    ...adminPermissions,
    ...userPermissions
  ]);
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
        "Maksimal 3 kategori", 
        "Maksimal 2 budget plan per periode",
        "Unlimited transaksi",
        "Laporan dasar",
        "Export PDF"
      ],
      maxWorkspaces: 1,
      maxMembers: 1,
      maxCategories: 3,
      maxBudgets: 2,
      maxSharedWorkspaces: 0,
      canCreateSharedWorkspace: false,
      type: "personal",
      description: "Paket gratis untuk pengelolaan keuangan pribadi",
      isActive: true
    },
    {
      id: 2,
      name: "pro",
      price: "15000.00",
      features: [
        "1 workspace pribadi",
        "Unlimited kategori",
        "Unlimited budget plan",
        "Unlimited transaksi",
        "Advanced reports & analytics",
        "Export ke Excel & CSV",
        "Priority support"
      ],
      maxWorkspaces: 1,
      maxMembers: 1,
      maxCategories: null, // unlimited
      maxBudgets: null, // unlimited
      maxSharedWorkspaces: 0,
      canCreateSharedWorkspace: false,
      type: "personal",
      description: "Paket personal pro untuk fitur unlimited",
      isActive: true
    },
    {
      id: 3,
      name: "professional",
      price: "25000.00",
      features: [
        "1 workspace pribadi unlimited",
        "1 shared workspace",
        "Kolaborasi hingga 7 anggota per shared workspace",
        "Unlimited kategori",
        "Unlimited budget plan",
        "Advanced collaboration tools",
        "Team reports & analytics",
        "Real-time sync",
        "Export ke Excel & CSV",
        "Priority support"
      ],
      maxWorkspaces: 1,
      maxMembers: 7,
      maxCategories: null, // unlimited
      maxBudgets: null, // unlimited
      maxSharedWorkspaces: 1,
      canCreateSharedWorkspace: true,
      type: "hybrid",
      description: "Paket professional dengan 1 shared workspace",
      isActive: true
    },
    {
      id: 4,
      name: "business",
      price: "50000.00",
      features: [
        "Unlimited workspace pribadi",
        "Unlimited shared workspace",
        "Kolaborasi hingga 15 anggota per shared workspace",
        "Unlimited kategori",
        "Unlimited budget plan",
        "Advanced team management",
        "Custom roles & permissions",
        "Advanced analytics & insights",
        "API access",
        "White-label options",
        "Dedicated support"
      ],
      maxWorkspaces: null, // unlimited
      maxMembers: 15,
      maxCategories: null, // unlimited
      maxBudgets: null, // unlimited
      maxSharedWorkspaces: null, // unlimited
      canCreateSharedWorkspace: true,
      type: "hybrid",
      description: "Paket business untuk tim dan organisasi",
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
    // Personal workspaces - setiap user harus punya workspace Personal sendiri
    {
      id: 1,
      name: "Personal",
      type: "personal",
      ownerId: 1 // Root user
    },
    {
      id: 2,
      name: "Personal", 
      type: "personal",
      ownerId: 2 // Admin user
    },
    {
      id: 3,
      name: "Personal",
      type: "personal", 
      ownerId: 3 // Demo user
    },
    {
      id: 4,
      name: "Personal",
      type: "personal",
      ownerId: 4 // John Doe
    },
    {
      id: 5,
      name: "Personal", 
      type: "personal",
      ownerId: 5 // Jane Smith - PENTING: sekarang punya Personal workspace sendiri
    },
    // Collaboration workspaces
    {
      id: 6,
      name: "Family Budget",
      type: "family",
      ownerId: 4
    },
    {
      id: 7, 
      name: "Small Business",
      type: "business",
      ownerId: 4
    }
  ]).onConflictDoNothing();
}

async function seedWorkspaceMembers() {
  console.log("Seeding workspace members...");
  
  await db.insert(workspaceMembers).values([
    // Personal workspace memberships (setiap user owner di Personal workspace mereka sendiri)
    { workspaceId: 1, userId: 1, role: 'owner' }, // Root - Personal
    { workspaceId: 2, userId: 2, role: 'owner' }, // Admin - Personal  
    { workspaceId: 3, userId: 3, role: 'owner' }, // Demo - Personal
    { workspaceId: 4, userId: 4, role: 'owner' }, // John - Personal
    { workspaceId: 5, userId: 5, role: 'owner' }, // Jane - Personal (FIXED: sekarang punya Personal sendiri)
    
    // Collaboration workspace memberships
    { workspaceId: 6, userId: 4, role: 'owner' }, // John owner Family Budget
    { workspaceId: 6, userId: 3, role: 'editor' }, // Demo sebagai editor di Family Budget
    { workspaceId: 7, userId: 4, role: 'owner' }, // John owner Small Business  
    { workspaceId: 7, userId: 5, role: 'editor' }, // Jane sebagai editor di Small Business John
  ]).onConflictDoNothing();
}

async function seedCategories() {
  console.log("Seeding categories...");
  
  await db.insert(categories).values([
    // Basic categories untuk Personal workspaces (setiap personal workspace dapat basic categories)
    // Root Personal workspace (id: 1)
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 1 },
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 1 },
    { name: "Hiburan", type: "wants", icon: "🎬", description: "Pengeluaran hiburan", workspaceId: 1 },
    
    // Admin Personal workspace (id: 2) 
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 2 },
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 2 },
    { name: "Hiburan", type: "wants", icon: "🎬", description: "Pengeluaran hiburan", workspaceId: 2 },
    
    // Demo Personal workspace (id: 3) - basic package = max 3 categories tambahan
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 3 },
    { name: "Freelance", type: "income", icon: "💻", description: "Pendapatan freelance", workspaceId: 3 },
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 3 },
    { name: "Transportasi", type: "needs", icon: "🚗", description: "Biaya transportasi", workspaceId: 3 }, // Total: 4 categories (basic limit akan dicek di aplikasi)
    
    // John Personal workspace (id: 4) - premium package
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 4 },
    { name: "Freelance", type: "income", icon: "💻", description: "Pendapatan freelance", workspaceId: 4 },
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 4 },
    { name: "Transportasi", type: "needs", icon: "🚗", description: "Biaya transportasi", workspaceId: 4 },
    { name: "Hiburan", type: "wants", icon: "🎬", description: "Pengeluaran hiburan", workspaceId: 4 },
    
    // Jane Personal workspace (id: 5) - basic package = max 3 categories tambahan
    { name: "Gaji", type: "income", icon: "💰", description: "Pendapatan dari pekerjaan", workspaceId: 5 },
    { name: "Makanan", type: "needs", icon: "🍽️", description: "Kebutuhan makanan sehari-hari", workspaceId: 5 },
    { name: "Hiburan", type: "wants", icon: "🎬", description: "Pengeluaran hiburan", workspaceId: 5 }, // Total: 3 categories (sesuai basic limit)
    
    // Categories for Family Budget workspace (id: 6)
    { name: "Gaji Suami", type: "income", icon: "💰", description: "Pendapatan suami", workspaceId: 6 },
    { name: "Gaji Istri", type: "income", icon: "💰", description: "Pendapatan istri", workspaceId: 6 },
    { name: "Belanja Bulanan", type: "needs", icon: "🛒", description: "Belanja kebutuhan bulanan", workspaceId: 6 },
    { name: "Pendidikan Anak", type: "needs", icon: "🎓", description: "Biaya pendidikan", workspaceId: 6 },
    { name: "Kesehatan", type: "needs", icon: "🏥", description: "Biaya kesehatan", workspaceId: 6 },
    
    // Categories for Small Business workspace (id: 7)
    { name: "Penjualan", type: "income", icon: "💵", description: "Pendapatan penjualan", workspaceId: 7 },
    { name: "Operasional", type: "needs", icon: "⚙️", description: "Biaya operasional", workspaceId: 7 },
    { name: "Marketing", type: "wants", icon: "📢", description: "Biaya marketing", workspaceId: 7 },
  ]).onConflictDoNothing();
}

async function seedAccounts() {
  console.log("Seeding accounts...");
  
  await db.insert(accounts).values([
    // Root Personal workspace (id: 1)
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 1 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 1 },
    
    // Admin Personal workspace (id: 2)
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 2 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 2 },
    
    // Demo Personal workspace (id: 3)
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 3 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 3 },
    
    // John Personal workspace (id: 4)
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 4 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 4 },
    { name: "E-Wallet", type: "transaction", currency: "IDR", workspaceId: 4 },
    
    // Jane Personal workspace (id: 5)
    { name: "Bank BCA", type: "transaction", currency: "IDR", workspaceId: 5 },
    { name: "Cash", type: "transaction", currency: "IDR", workspaceId: 5 },
    
    // Family Budget workspace (id: 6)
    { name: "Rekening Keluarga", type: "transaction", currency: "IDR", workspaceId: 6 },
    { name: "Kas Kecil", type: "transaction", currency: "IDR", workspaceId: 6 },
    { name: "Tabungan Anak", type: "asset", currency: "IDR", workspaceId: 6 },
    
    // Small Business workspace (id: 7)
    { name: "Rekening Bisnis", type: "transaction", currency: "IDR", workspaceId: 7 },
    { name: "Petty Cash", type: "transaction", currency: "IDR", workspaceId: 7 },
    { name: "Investasi", type: "asset", currency: "IDR", workspaceId: 7 },
  ]).onConflictDoNothing();
}

export async function runSeeder(reset = false) {
  try {
    console.log("Starting database seeding...");
    
    if (reset) {
      await resetDatabase();
    }
    
    await seedRoles();
    await seedPermissions();
    await seedRolePermissions();
    await seedSubscriptionPackages();
    await seedUsers();
    await seedUserSubscriptions();
    await seedWorkspaces();
    await seedWorkspaceMembers();
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
  const shouldReset = process.argv.includes('--reset');
  
  runSeeder(shouldReset)
    .then(() => {
      console.log("Seeder finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeder failed:", error);
      process.exit(1);
    });
}