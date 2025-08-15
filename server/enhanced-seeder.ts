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
  accounts
} from "@shared/schema";
import bcrypt from "bcrypt";

async function resetDatabase() {
  console.log("🔄 Resetting database for enhanced RBAC...");

  // Delete in correct order (foreign key constraints)
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

  console.log("✅ Database reset completed!");
}

async function seedEnhancedRoles() {
  console.log("🔐 Seeding enhanced roles...");

  await db.insert(roles).values([
    { id: 1, name: "root", description: "Super administrator dengan bypass penuh sistem" },
    { id: 2, name: "admin", description: "Administrator aplikasi dengan akses manajemen user dan sistem" },
    { id: 3, name: "user_basic", description: "User basic dengan fitur terbatas sesuai paket basic" },
    { id: 4, name: "user_premium", description: "User premium dengan fitur unlimited untuk personal" },
  ]).onConflictDoNothing();
}

async function seedEnhancedPermissions() {
  console.log("🛡️ Seeding enhanced permissions with admin/user separation...");

  const enhancedPermissions = [
    // ROOT BYPASS - Universal access
    { name: "root.bypass", description: "Root user bypass all checks", resource: "system", action: "bypass" },

    // ADMIN PERMISSIONS (admin.* prefix)
    { name: "admin.users.pages", description: "See User Management menu", resource: "admin_users", action: "pages" },
    { name: "admin.users.access", description: "Access User Management page", resource: "admin_users", action: "access" },
    { name: "admin.users.create", description: "Create new users", resource: "admin_users", action: "create" },
    { name: "admin.users.read", description: "View user data", resource: "admin_users", action: "read" },
    { name: "admin.users.update", description: "Update user data", resource: "admin_users", action: "update" },
    { name: "admin.users.delete", description: "Delete users", resource: "admin_users", action: "delete" },

    { name: "admin.roles.pages", description: "See Role Management menu", resource: "admin_roles", action: "pages" },
    { name: "admin.roles.access", description: "Access Role Management page", resource: "admin_roles", action: "access" },
    { name: "admin.roles.create", description: "Create new roles", resource: "admin_roles", action: "create" },
    { name: "admin.roles.read", description: "View role data", resource: "admin_roles", action: "read" },
    { name: "admin.roles.update", resource: "admin_roles", action: "update" },
    { name: "admin.roles.delete", description: "Delete roles", resource: "admin_roles", action: "delete" },

    { name: "admin.permissions.pages", description: "See Permission Management menu", resource: "admin_permissions", action: "pages" },
    { name: "admin.permissions.access", description: "Access Permission Management", resource: "admin_permissions", action: "access" },
    { name: "admin.permissions.read", description: "View permission data", resource: "admin_permissions", action: "read" },

    { name: "admin.subscriptions.pages", description: "See Subscription Management menu", resource: "admin_subscriptions", action: "pages" },
    { name: "admin.subscriptions.access", description: "Access Subscription Management", resource: "admin_subscriptions", action: "access" },
    { name: "admin.subscriptions.manage", description: "Manage all subscriptions", resource: "admin_subscriptions", action: "manage" },

    { name: "admin.settings.pages", description: "See App Settings menu", resource: "admin_settings", action: "pages" },
    { name: "admin.settings.access", description: "Access App Settings", resource: "admin_settings", action: "access" },
    { name: "admin.settings.update", description: "Update app settings", resource: "admin_settings", action: "update" },

    // USER PERMISSIONS (user.* prefix) - Dashboard
    { name: "user.dashboard.pages", description: "See Dashboard menu", resource: "user_dashboard", action: "pages" },
    { name: "user.dashboard.access", description: "Access Dashboard", resource: "user_dashboard", action: "access" },

    // USER PERMISSIONS - Accounts  
    { name: "user.accounts.pages", description: "See Accounts menu", resource: "user_accounts", action: "pages" },
    { name: "user.accounts.access", description: "Access Accounts page", resource: "user_accounts", action: "access" },
    { name: "user.accounts.create", description: "Create accounts", resource: "user_accounts", action: "create" },
    { name: "user.accounts.read", description: "View account data", resource: "user_accounts", action: "read" },
    { name: "user.accounts.update", description: "Update accounts", resource: "user_accounts", action: "update" },
    { name: "user.accounts.delete", description: "Delete accounts", resource: "user_accounts", action: "delete" },

    // USER PERMISSIONS - Transactions
    { name: "user.transactions.pages", description: "See Transactions menu", resource: "user_transactions", action: "pages" },
    { name: "user.transactions.access", description: "Access Transactions page", resource: "user_transactions", action: "access" },
    { name: "user.transactions.create", description: "Create transactions", resource: "user_transactions", action: "create" },
    { name: "user.transactions.read", description: "View transaction data", resource: "user_transactions", action: "read" },
    { name: "user.transactions.update", description: "Update transactions", resource: "user_transactions", action: "update" },
    { name: "user.transactions.delete", description: "Delete transactions", resource: "user_transactions", action: "delete" },

    // USER PERMISSIONS - Categories
    { name: "user.categories.pages", description: "See Categories menu", resource: "user_categories", action: "pages" },
    { name: "user.categories.access", description: "Access Categories page", resource: "user_categories", action: "access" },
    { name: "user.categories.create", description: "Create categories (subscription limited)", resource: "user_categories", action: "create" },
    { name: "user.categories.read", description: "View category data", resource: "user_categories", action: "read" },
    { name: "user.categories.update", description: "Update categories", resource: "user_categories", action: "update" },
    { name: "user.categories.delete", description: "Delete categories", resource: "user_categories", action: "delete" },

    // USER PERMISSIONS - Budgets
    { name: "user.budgets.pages", description: "See Budget menu", resource: "user_budgets", action: "pages" },
    { name: "user.budgets.access", description: "Access Budget page", resource: "user_budgets", action: "access" },
    { name: "user.budgets.create", description: "Create budgets (subscription limited)", resource: "user_budgets", action: "create" },
    { name: "user.budgets.read", description: "View budget data", resource: "user_budgets", action: "read" },
    { name: "user.budgets.update", description: "Update budgets", resource: "user_budgets", action: "update" },
    { name: "user.budgets.delete", description: "Delete budgets", resource: "user_budgets", action: "delete" },

    // USER PERMISSIONS - Reports
    { name: "user.reports.pages", description: "See Reports menu", resource: "user_reports", action: "pages" },
    { name: "user.reports.access", description: "Access Reports page", resource: "user_reports", action: "access" },
    { name: "user.reports.read", description: "View reports", resource: "user_reports", action: "read" },
    { name: "user.reports.export", description: "Export reports (premium feature)", resource: "user_reports", action: "export" },

    // USER PERMISSIONS - Debts
    { name: "user.debts.pages", description: "See Debts menu", resource: "user_debts", action: "pages" },
    { name: "user.debts.access", description: "Access Debts page", resource: "user_debts", action: "access" },
    { name: "user.debts.create", description: "Create debt records", resource: "user_debts", action: "create" },
    { name: "user.debts.read", description: "View debt data", resource: "user_debts", action: "read" },
    { name: "user.debts.update", description: "Update debt records", resource: "user_debts", action: "update" },
    { name: "user.debts.delete", description: "Delete debt records", resource: "user_debts", action: "delete" },

    // USER PERMISSIONS - Collaboration (Professional+ only)
    { name: "user.collaboration.pages", description: "See Collaboration menu (professional+)", resource: "user_collaboration", action: "pages" },
    { name: "user.collaboration.access", description: "Access Collaboration page (professional+)", resource: "user_collaboration", action: "access" },
    { name: "user.collaboration.invite", description: "Invite workspace members (professional+)", resource: "user_collaboration", action: "invite" },
    { name: "user.collaboration.manage", description: "Manage workspace members (professional+)", resource: "user_collaboration", action: "manage" },

    // USER PERMISSIONS - Workspaces
    { name: "user.workspaces.pages", description: "See workspace selector", resource: "user_workspaces", action: "pages" },
    { name: "user.workspaces.access", description: "Access workspaces", resource: "user_workspaces", action: "access" },
    { name: "user.workspaces.create", description: "Create workspaces (subscription limited)", resource: "user_workspaces", action: "create" },
    { name: "user.workspaces.read", description: "View workspace data", resource: "user_workspaces", action: "read" },
    { name: "user.workspaces.update", description: "Update workspaces", resource: "user_workspaces", action: "update" },
    { name: "user.workspaces.delete", description: "Delete workspaces", resource: "user_workspaces", action: "delete" },

    // USER PERMISSIONS - Profile
    { name: "user.profile.pages", description: "See Profile menu", resource: "user_profile", action: "pages" },
    { name: "user.profile.access", description: "Access Profile page", resource: "user_profile", action: "access" },
    { name: "user.profile.update", description: "Update profile", resource: "user_profile", action: "update" },

    // USER PERMISSIONS - Subscription
    { name: "user.subscription.pages", description: "See Subscription menu", resource: "user_subscription", action: "pages" },
    { name: "user.subscription.access", description: "Access Subscription page", resource: "user_subscription", action: "access" },
    { name: "user.subscription.upgrade", description: "Upgrade subscription", resource: "user_subscription", action: "upgrade" },
  ];

  await db.insert(permissions).values(enhancedPermissions).onConflictDoNothing();
}

async function seedEnhancedRolePermissions() {
  console.log("🎯 Seeding enhanced role permissions with subscription enforcement...");

  // Clear existing role permissions
  await db.delete(rolePermissions);

  // Get all permissions
  const allPermissions = await db.select().from(permissions);

  // ROOT PERMISSIONS (ALL)
  const rootPermissions = allPermissions.map(permission => ({
    roleId: 1,
    permissionId: permission.id
  }));

  // ADMIN PERMISSIONS (admin.* + basic user.* features)
  const adminPermissions = allPermissions
    .filter(permission => 
      permission.name.startsWith("admin.") || 
      (permission.name.startsWith("user.") && !permission.name.includes("collaboration"))
    )
    .map(permission => ({
      roleId: 2,
      permissionId: permission.id
    }));

  // USER_BASIC PERMISSIONS (basic user.* features, no collaboration, limited by subscription)
  const userBasicPermissions = allPermissions
    .filter(permission => 
      permission.name.startsWith("user.") && 
      !permission.name.includes("collaboration") &&
      !permission.name.includes("reports.export") // Export is premium feature
    )
    .map(permission => ({
      roleId: 3,
      permissionId: permission.id
    }));

  // USER_PREMIUM PERMISSIONS (all user.* features except collaboration)
  const userPremiumPermissions = allPermissions
    .filter(permission => 
      permission.name.startsWith("user.") && 
      !permission.name.includes("collaboration") // Collaboration requires Professional+
    )
    .map(permission => ({
      roleId: 4,
      permissionId: permission.id
    }));

  await db.insert(rolePermissions).values([
    ...rootPermissions,
    ...adminPermissions,
    ...userBasicPermissions,
    ...userPremiumPermissions
  ]);
}

async function seedEnhancedSubscriptionPackages() {
  console.log("💳 Seeding enhanced subscription packages...");

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
        "Laporan dasar (tanpa export)",
        "Support standar"
      ],
      maxWorkspaces: 1,
      maxAccounts: 2,
      maxMembers: 1,
      maxCategories: 3,
      maxBudgets: 2,
      maxSharedWorkspaces: 0,
      canCreateSharedWorkspace: false,
      type: "personal",
      description: "Paket gratis untuk pengelolaan keuangan pribadi basic",
      isActive: true
    },
    {
      id: 2,
      name: "premium",
      price: "15000.00",
      features: [
        "1 workspace pribadi",
        "5 account",
        "Unlimited kategori",
        "Unlimited budget plan per periode",
        "Unlimited transaksi",
        "Advanced reports & analytics",
        "Export ke Excel & CSV",
        "Priority support"
      ],
      maxWorkspaces: 1,
      maxAccounts: 5,
      maxMembers: 1,
      maxCategories: 5,
      maxBudgets: 5,
      maxSharedWorkspaces: 0,
      canCreateSharedWorkspace: false,
      type: "personal",
      description: "Paket premium untuk fitur personal unlimited dengan export",
      isActive: true
    },
    {
      id: 3,
      name: "professional",
      price: "25000.00",
      features: [
        "1 workspace pribadi unlimited",
        "2 shared workspace",
        "7 account",
        "Kolaborasi hingga 7 anggota per shared workspace",
        "10 kategori",
        "10 budget plan",
        "Advanced collaboration tools",
        "Team reports & analytics",
        "Real-time sync",
        "Export ke Excel & CSV",
        "Priority support"
      ],
      maxWorkspaces: 1,
      maxAccounts: 7,
      maxMembers: 7,
      maxCategories: 10,
      maxBudgets: 10,
      maxSharedWorkspaces: 1,
      canCreateSharedWorkspace: true,
      type: "hybrid",
      description: "Paket professional dengan 1 shared workspace dan collaboration",
      isActive: true
    },
    {
      id: 4,
      name: "business",
      price: "50000.00",
      features: [
         "7 workspace pribadi",
        "10 shared workspace",
        "Kolaborasi hingga 15 anggota per shared workspace",
        "15 account",
        "20 kategori",
        "20 budget plan",
        "Advanced team management",
        "Custom roles & permissions",
        "Advanced analytics & insights",
        "API access",
        "White-label options",
        "Dedicated support"
      ],
      maxWorkspaces: 7,
      maxAccounts: 15,
      maxMembers: 15,
      maxCategories: 20,
      maxBudgets: 20,
      maxSharedWorkspaces: 10,
      canCreateSharedWorkspace: true,
      type: "hybrid",
      description: "Paket business untuk tim dan organisasi besar",
      isActive: true
    }
  ]).onConflictDoNothing();
}

async function seedEnhancedUsers() {
  console.log("👥 Seeding enhanced users with proper role assignments...");

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const demoPassword = await bcrypt.hash("demo123", 10);

  await db.insert(users).values([
    {
      id: 1,
      email: "root@financeflow.com",
      password: hashedPassword,
      name: "Root Administrator",
      roleId: 1 // root
    },
    {
      id: 2,
      email: "admin@financeflow.com",
      password: hashedPassword,
      name: "System Administrator",
      roleId: 2 // admin
    },
    {
      id: 3,
      email: "basic@financeflow.com",
      password: demoPassword,
      name: "Basic User",
      roleId: 3 // user_basic
    },
    {
      id: 4,
      email: "premium@financeflow.com",
      password: demoPassword,
      name: "Premium User",
      roleId: 4 // user_premium
    },
    {
      id: 5,
      email: "demo@financeflow.com",
      password: demoPassword,
      name: "Demo User Basic",
      roleId: 3 // user_basic
    }
  ]).onConflictDoNothing();
}

async function seedEnhancedUserSubscriptions() {
  console.log("📋 Seeding enhanced user subscriptions...");

  const now = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(now.getFullYear() + 1);

  const unlimitedYear = new Date();
  unlimitedYear.setFullYear(now.getFullYear() + 999);

  await db.insert(userSubscriptions).values([
    {
      userId: 1,
      packageId: 4, // Business for root
      startDate: now,
      endDate: unlimitedYear,
      status: "active"
    },
    {
      userId: 2,
      packageId: 4, // Business for admin
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 3,
      packageId: 1, // Basic for basic user
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 4,
      packageId: 2, // Premium for premium user
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    },
    {
      userId: 5,
      packageId: 1, // Basic for demo user
      startDate: now,
      endDate: oneYearLater,
      status: "active"
    }
  ]).onConflictDoNothing();
}

async function seedEnhancedWorkspaces() {
  console.log("🏢 Seeding enhanced workspaces...");

  await db.insert(workspaces).values([
    // Personal workspaces - every user must have their own Personal workspace
    { id: 1, name: "Personal", type: "personal", ownerId: 1 },
    { id: 2, name: "Personal", type: "personal", ownerId: 2 },
    { id: 3, name: "Personal", type: "personal", ownerId: 3 },
    { id: 4, name: "Personal", type: "personal", ownerId: 4 },
    { id: 5, name: "Personal", type: "personal", ownerId: 5 },
  ]).onConflictDoNothing();
}

async function seedEnhancedWorkspaceMembers() {
  console.log("👥 Seeding enhanced workspace members...");

  await db.insert(workspaceMembers).values([
    // Personal workspace memberships (each user is owner of their Personal workspace)
    { workspaceId: 1, userId: 1, role: 'owner' }, // Root - Personal
    { workspaceId: 2, userId: 2, role: 'owner' }, // Admin - Personal  
    { workspaceId: 3, userId: 3, role: 'owner' }, // Basic - Personal
    { workspaceId: 4, userId: 4, role: 'owner' }, // Premium - Personal
    { workspaceId: 5, userId: 5, role: 'owner' }, // Demo - Personal
  ]).onConflictDoNothing();
}

async function seedEnhancedCategories() {
  console.log("🏷️ Seeding enhanced categories with proper workspace assignments...");

  // Categories for each personal workspace
  const categoryData = [
    // Root user categories (workspace 1)
    { name: "Salary", type: "income", icon: "briefcase", description: "Monthly salary", workspaceId: 1 },
    { name: "Food & Dining", type: "needs", icon: "utensils", description: "Food expenses", workspaceId: 1 },
    { name: "Entertainment", type: "wants", icon: "gamepad", description: "Entertainment expenses", workspaceId: 1 },

    // Admin user categories (workspace 2)
    { name: "Freelance Income", type: "income", icon: "briefcase", description: "Freelance work", workspaceId: 2 },
    { name: "Utilities", type: "needs", icon: "bolt", description: "Electricity, water, etc", workspaceId: 2 },
    { name: "Shopping", type: "wants", icon: "shopping-cart", description: "Non-essential shopping", workspaceId: 2 },

    // Basic user categories (workspace 3) - LIMITED TO 3
    { name: "Job Income", type: "income", icon: "briefcase", description: "Primary job income", workspaceId: 3 },
    { name: "Groceries", type: "needs", icon: "shopping-cart", description: "Food and groceries", workspaceId: 3 },
    { name: "Transport", type: "needs", icon: "bus", description: "Transportation costs", workspaceId: 3 },

    // Premium user categories (workspace 4) - UNLIMITED
    { name: "Business Income", type: "income", icon: "briefcase", description: "Business revenue", workspaceId: 4 },
    { name: "Housing", type: "needs", icon: "home", description: "Rent and housing costs", workspaceId: 4 },
    { name: "Healthcare", type: "needs", icon: "stethoscope", description: "Medical expenses", workspaceId: 4 },
    { name: "Travel", type: "wants", icon: "plane", description: "Travel and vacation", workspaceId: 4 },
    { name: "Gadgets", type: "wants", icon: "phone", description: "Technology purchases", workspaceId: 4 },

    // Demo user categories (workspace 5) - LIMITED TO 3
    { name: "Part-time Work", type: "income", icon: "briefcase", description: "Part-time income", workspaceId: 5 },
    { name: "Education", type: "needs", icon: "graduation-cap", description: "Education costs", workspaceId: 5 },
    { name: "Coffee", type: "wants", icon: "coffee", description: "Coffee and treats", workspaceId: 5 },
  ];

  await db.insert(categories).values(categoryData).onConflictDoNothing();
}

async function seedEnhancedAccounts() {
  console.log("🏦 Seeding enhanced accounts with proper workspace assignments...");

  // Create accounts for root user (balance calculated from transactions)
  await db.insert(accounts).values([
    {
      name: "Main Checking",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Primary checking account",
      workspaceId: 1,
    },
    {
      name: "Savings Account",
      type: "asset",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Emergency fund and savings",
      workspaceId: 1,
    },
    {
      name: "Investment Portfolio",
      type: "asset",
      currency: "IDR", 
      balance: "0", // Will be calculated from transactions
      notes: "Stock and mutual fund investments",
      workspaceId: 1,
    },
    {
      name: "Cash",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Physical cash on hand",
      workspaceId: 1,
    },
  ]).onConflictDoNothing();

  // Create accounts for admin user (balance calculated from transactions)
  await db.insert(accounts).values([
    {
      name: "Business Account",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Main business account",
      workspaceId: 2,
    },
    {
      name: "Investment Portfolio",
      type: "asset",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Company investments",
      workspaceId: 2,
    },
  ]).onConflictDoNothing();

  // Create account for basic user (balance calculated from transactions)
  await db.insert(accounts).values([
    {
      name: "Checking Account",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Primary personal account",
      workspaceId: 3,
    },
  ]).onConflictDoNothing();

  // Create accounts for premium user (balance calculated from transactions)
  await db.insert(accounts).values([
    {
      name: "Primary Checking",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Primary personal checking account",
      workspaceId: 4,
    },
    {
      name: "High-Yield Savings",
      type: "asset",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "High-yield savings account",
      workspaceId: 4,
    },
    {
      name: "Investment Account",
      type: "asset",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Personal investment account",
      workspaceId: 4,
    },
  ]).onConflictDoNothing();

  // Create demo accounts for demo user (balance calculated from transactions)
  await db.insert(accounts).values([
    {
      name: "Student Account",
      type: "transaction",
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Main account for daily expenses",
      workspaceId: 5,
    },
    {
      name: "Cash Wallet",
      type: "transaction", 
      currency: "IDR",
      balance: "0", // Will be calculated from transactions
      notes: "Cash for daily expenses",
      workspaceId: 5,
    },
  ]).onConflictDoNothing();
}

async function main() {
  console.log("🚀 Starting enhanced RBAC database seeding...");

  try {
    await resetDatabase();
    await seedEnhancedRoles();
    await seedEnhancedPermissions();
    await seedEnhancedRolePermissions();
    await seedEnhancedSubscriptionPackages();
    await seedEnhancedUsers();
    await seedEnhancedUserSubscriptions();
    await seedEnhancedWorkspaces();
    await seedEnhancedWorkspaceMembers();
    await seedEnhancedCategories();
    await seedEnhancedAccounts();

    console.log("✅ Enhanced RBAC database seeding completed successfully!");
    console.log("\n🔐 ENHANCED RBAC SUMMARY:");
    console.log("• Root user: root@financeflow.com (password: admin123) - Full bypass access");
    console.log("• Admin user: admin@financeflow.com (password: admin123) - System administration");
    console.log("• Basic user: basic@financeflow.com (password: demo123) - Limited features");
    console.log("• Premium user: premium@financeflow.com (password: demo123) - Personal unlimited");
    console.log("• Demo user: demo@financeflow.com (password: demo123) - Basic demo account");
    console.log("\n🛡️ SECURITY IMPROVEMENTS:");
    console.log("• Separated admin.* and user.* permissions");  
    console.log("• Added .pages and .access granularity");
    console.log("• Subscription-aware permission enforcement");
    console.log("• Proper role hierarchy with security boundaries");
    console.log("• Protected collaboration features for Professional+ users");

  } catch (error) {
    console.error("❌ Enhanced seeding failed:", error);
    process.exit(1);
  }
}

main().then(() => {
  console.log("🎯 Enhanced seeder finished successfully");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Enhanced seeder failed:", error);
  process.exit(1);
});