import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedWorkspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
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

export const debtsRelations = relations(debts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [debts.workspaceId],
    references: [workspaces.id],
  }),
}));

// Insert schemas
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;

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
