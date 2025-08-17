import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, date, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles table
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'root', 'admin', 'user'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  resource: text("resource").notNull(), // 'users', 'workspaces', 'transactions', etc.
  action: text("action").notNull(), // 'create', 'read', 'update', 'delete'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Role permissions table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription packages table
export const subscriptionPackages = pgTable("subscription_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'basic', 'pro', 'professional', 'business'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: text("features").array().notNull(),
  maxWorkspaces: integer("max_workspaces").notNull(),
  maxAccounts: integer("max_accounts").notNull().default(1),
  maxMembers: integer("max_members").notNull(),
  maxCategories: integer("max_categories"), // null = unlimited
  maxBudgets: integer("max_budgets"), // null = unlimited
  maxSharedWorkspaces: integer("max_shared_workspaces").notNull().default(0), // New field
  canCreateSharedWorkspace: boolean("can_create_shared_workspace").notNull().default(false), // New field
  type: text("type").notNull().default("personal"), // 'personal' | 'shared' | 'hybrid'
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  packageId: integer("package_id").references(() => subscriptionPackages.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'expired', 'cancelled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workspace subscriptions table (for shared workspaces)
export const workspaceSubscriptions = pgTable("workspace_subscriptions", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  packageId: integer("package_id").references(() => subscriptionPackages.id).notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(), // Who pays for this
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'expired', 'readonly', 'cancelled'
  gracePeriodEnd: timestamp("grace_period_end"), // 3 days after expiry
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// App Settings table
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("FinanceFlow"),
  appDescription: text("app_description").notNull().default("Personal Finance Management Application"),
  appLogo: text("app_logo"),
  defaultTheme: text("default_theme").notNull().default("light"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  defaultLanguage: text("default_language").notNull().default("en"),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  requireEmailVerification: boolean("require_email_verification").notNull().default(false),
  enableNotifications: boolean("enable_notifications").notNull().default(true),
  sessionTimeout: integer("session_timeout").notNull().default(86400), // 24 hours in seconds
  maxWorkspaces: integer("max_workspaces").notNull().default(5),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull().default(3), // Default to 'user' role
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workspaces table
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'personal' | 'family' | 'business'
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workspace members table for collaboration
export const workspaceMembers = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // 'owner' | 'editor' | 'viewer'
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'income' | 'needs' | 'wants'
  icon: text("icon").notNull(),
  description: text("description"),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'transaction' | 'asset'
  currency: text("currency").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'income' | 'expense' | 'transfer' | 'saving' | 'debt' | 'repayment'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  toAccountId: integer("to_account_id").references(() => accounts.id), // For transfers
  debtId: integer("debt_id").references(() => debts.id), // Link to debt record for repayments
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Budget table
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  period: text("period").notNull(), // 'monthly' | 'yearly'
  month: integer("month"), // 1-12
  year: integer("year").notNull(),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Debts table
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'debt' | 'credit'
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  dueDate: timestamp("due_date"),
  status: text("status").notNull(), // 'active' | 'paid' | 'overdue'
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'savings' | 'debt_payment' | 'investment' | 'emergency_fund' | 'retirement'
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  targetDate: date("target_date").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'paused'
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recurring transactions table
export const recurringTransactions = pgTable("recurring_transactions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'income' | 'expense' | 'transfer'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  nextExecution: timestamp("next_execution").notNull(),
  lastExecuted: timestamp("last_executed"),
  isActive: boolean("is_active").notNull().default(true),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Category rules table for auto-categorization
export const categoryRules = pgTable("category_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pattern: text("pattern").notNull(), // Comma-separated keywords
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  timesUsed: integer("times_used").notNull().default(0),
  workspaceId: integer("workspace_id").references(() => workspaces.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const subscriptionPackagesRelations = relations(subscriptionPackages, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  package: one(subscriptionPackages, {
    fields: [userSubscriptions.packageId],
    references: [subscriptionPackages.id],
  }),
}));

export const workspaceSubscriptionsRelations = relations(workspaceSubscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceSubscriptions.workspaceId],
    references: [workspaces.id],
  }),
  package: one(subscriptionPackages, {
    fields: [workspaceSubscriptions.packageId],
    references: [subscriptionPackages.id],
  }),
  owner: one(users, {
    fields: [workspaceSubscriptions.ownerId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  ownedWorkspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
  userSubscriptions: many(userSubscriptions),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  debts: many(debts),
  goals: many(goals),
  recurringTransactions: many(recurringTransactions),
  categoryRules: many(categoryRules),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [categories.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accounts.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(transactions),
  transfersFrom: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  workspace: one(workspaces, {
    fields: [transactions.workspaceId],
    references: [workspaces.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  workspace: one(workspaces, {
    fields: [budgets.workspaceId],
    references: [workspaces.id],
  }),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [debts.workspaceId],
    references: [workspaces.id],
  }),
  repaymentTransactions: many(transactions),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [goals.workspaceId],
    references: [workspaces.id],
  }),
}));

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [recurringTransactions.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [recurringTransactions.accountId],
    references: [accounts.id],
  }),
}));

export const categoryRulesRelations = relations(categoryRules, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [categoryRules.workspaceId],
    references: [workspaces.id],
  }),
  category: one(categories, {
    fields: [categoryRules.categoryId],
    references: [categories.id],
  }),
}));

// Insert schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPackageSchema = createInsertSchema(subscriptionPackages).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSubscriptionSchema = createInsertSchema(workspaceSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

export const insertDebtSchema = createInsertSchema(debts).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  nextExecution: true,
  lastExecuted: true,
});

export const insertCategoryRuleSchema = createInsertSchema(categoryRules).omit({
  id: true,
  createdAt: true,
  timesUsed: true,
});

// Notifications table for persistent notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'info', 'success', 'warning', 'error'
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category'), // 'budget', 'debt', 'goal', 'transaction', 'system'
  isRead: boolean('is_read').default(false),
  data: json('data'), // Additional context data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Types
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;
export type InsertSubscriptionPackage = z.infer<typeof insertSubscriptionPackageSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type WorkspaceSubscription = typeof workspaceSubscriptions.$inferSelect;
export type InsertWorkspaceSubscription = z.infer<typeof insertWorkspaceSubscriptionSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;

export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;

export type CategoryRule = typeof categoryRules.$inferSelect;
export type InsertCategoryRule = z.infer<typeof insertCategoryRuleSchema>;

export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type InsertWorkspaceInvite = z.infer<typeof insertWorkspaceInviteSchema>;
