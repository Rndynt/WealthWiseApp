import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  workspaces,
  workspaceMembers,
  workspaceSubscriptions,
  categories,
  accounts,
  transactions,
  budgets,
  debts,
  roles,
  permissions,
  rolePermissions,
  subscriptionPackages,
  notifications,
  userSubscriptions,
  appSettings,
  goals,
  goalContributions,
  goalMilestones,
  goalInsights,
  recurringTransactions,
  categoryRules,
  type User,
  type Workspace,
  type Category,
  type Account,
  type Transaction,
  type Budget,
  type Debt,
  type Role,
  type Permission,
  type RolePermission,
  type SubscriptionPackage,
  type UserSubscription,
  type WorkspaceSubscription,
  type AppSettings,
  type InsertAppSettings,
  type Goal,
  type GoalContribution,
  type GoalMilestone,
  type GoalInsight,
  type InsertGoal,
  type InsertGoalContribution,
  type InsertGoalMilestone,
  type InsertGoalInsight,
  type RecurringTransaction,
  type InsertRecurringTransaction,
  type CategoryRule,
  type InsertCategoryRule,
  type InsertUser,
  type InsertWorkspace,
  type InsertCategory,
  type InsertAccount,
  type InsertTransaction,
  type InsertBudget,
  type InsertDebt,
  type InsertRole,
  type InsertPermission,
  type InsertRolePermission,
  type InsertSubscriptionPackage,
  type InsertUserSubscription,
  type InsertWorkspaceSubscription,
  type Notification,
  type InsertNotification,
} from '@shared/schema';
import {
  type WorkspaceMember,
  type InsertWorkspaceMember,
} from "@shared/schema";

export interface WorkspaceQuotaSection {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface WorkspaceQuotaBreakdown {
  personal: WorkspaceQuotaSection;
  shared: WorkspaceQuotaSection;
  sharedInvitations: {
    used: number;
  };
}

export interface UserSubscriptionLimitSummary {
  maxWorkspaces: number | null;
  maxMembers: number;
  maxSharedWorkspaces: number | null;
  canCreateSharedWorkspace: boolean;
  currentWorkspaces: number;
  breakdown: WorkspaceQuotaBreakdown;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workspaces
  getWorkspace(id: number): Promise<Workspace | undefined>;
  getUserWorkspaces(userId: number): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;

  // Workspace Members
  getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]>;
  addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;

  // Categories
  getWorkspaceCategories(workspaceId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Accounts
  getWorkspaceAccounts(workspaceId: number): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;

  // Transactions
  getWorkspaceTransactions(workspaceId: number, limit?: number): Promise<Transaction[]>;
  getAccountTransactions(accountId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Budgets
  getWorkspaceBudgets(workspaceId: number, year: number, month?: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: number): Promise<void>;

  // Debts
  getWorkspaceDebts(workspaceId: number): Promise<Debt[]>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;
  getDebtRepayments(debtId: number): Promise<Transaction[]>;

  // Dashboard data
  getDashboardData(workspaceId: number): Promise<{
    totalBalance: string;
    monthlyIncome: string;
    monthlyExpenses: string;
    netWorth: string;
    recentTransactions: Transaction[];
  }>;

  // RBAC - Roles
  getAllRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  // RBAC - Permissions
  getAllPermissions(): Promise<Permission[]>;
  getPermission(id: number): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: number, permission: Partial<InsertPermission>): Promise<Permission>;
  deletePermission(id: number): Promise<void>;

  // RBAC - Role Permissions
  getRolePermissions(roleId: number): Promise<Permission[]>;
  getUserPermissions(userId: number): Promise<string[]>;
  addRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(roleId: number, permissionId: number): Promise<void>;

  // Subscription Packages
  getAllSubscriptionPackages(): Promise<SubscriptionPackage[]>;
  getSubscriptionPackage(id: number): Promise<SubscriptionPackage | undefined>;
  createSubscriptionPackage(subscriptionPackage: InsertSubscriptionPackage): Promise<SubscriptionPackage>;
  updateSubscriptionPackage(id: number, subscriptionPackage: Partial<InsertSubscriptionPackage>): Promise<SubscriptionPackage>;
  deleteSubscriptionPackage(id: number): Promise<void>;

  // User Subscriptions
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getUserSubscriptionWithPackage(userId: number): Promise<{subscription: UserSubscription, package: SubscriptionPackage} | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription>;

  // Workspace Subscriptions
  getWorkspaceSubscription(workspaceId: number): Promise<WorkspaceSubscription | undefined>;
  getWorkspaceSubscriptionWithPackage(workspaceId: number): Promise<{subscription: WorkspaceSubscription, package: SubscriptionPackage} | undefined>;
  createWorkspaceSubscription(subscription: InsertWorkspaceSubscription): Promise<WorkspaceSubscription>;
  updateWorkspaceSubscription(id: number, subscription: Partial<InsertWorkspaceSubscription>): Promise<WorkspaceSubscription>;
  getUserOwnedWorkspaceSubscriptions(userId: number): Promise<{subscription: WorkspaceSubscription, package: SubscriptionPackage, workspace: Workspace}[]>;

  // User Management
  getAllUsers(): Promise<User[]>;
  getUserWithRole(id: number): Promise<User & { role: Role } | undefined>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Subscription validation
  getUserSubscriptionLimits(userId: number): Promise<UserSubscriptionLimitSummary | null>;
  canCreateWorkspace(userId: number): Promise<boolean>;

  // Account, Category & Budget Limits Validation
  checkAccountLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;
  checkCategoryLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;
  checkBudgetLimit(workspaceId: number, userId: number, year: number, month?: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;

  // Settings
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;

  // Goals (Enhanced)
  getGoalsByWorkspace(workspaceId: number): Promise<Goal[]>;
  getGoalWithDetails(goalId: number): Promise<Goal & {
    linkedAccount?: Account;
    linkedDebt?: Debt;
    contributions: GoalContribution[];
    milestones: GoalMilestone[];
    insights: GoalInsight[];
  } | null>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;
  
  // Enhanced Goals Features
  getGoalContributions(goalId: number): Promise<GoalContribution[]>;
  createGoalContribution(contribution: InsertGoalContribution): Promise<GoalContribution>;
  getGoalMilestones(goalId: number): Promise<GoalMilestone[]>;
  createGoalMilestone(milestone: InsertGoalMilestone): Promise<GoalMilestone>;
  updateGoalMilestone(id: number, milestone: Partial<InsertGoalMilestone>): Promise<GoalMilestone>;
  getGoalInsights(goalId: number): Promise<GoalInsight[]>;
  createGoalInsight(insight: InsertGoalInsight): Promise<GoalInsight>;
  markGoalInsightAsRead(id: number): Promise<void>;
  
  // Goal Analytics & AI Features
  getGoalPerformanceMetrics(workspaceId: number): Promise<any>;
  getSmartGoalSuggestions(workspaceId: number): Promise<any[]>;
  getWorkspaceFinancialHealth(workspaceId: number): Promise<any>;

  // Recurring Transactions
  getRecurringTransactionsByWorkspace(workspaceId: number): Promise<RecurringTransaction[]>;
  createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, transaction: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction>;
  deleteRecurringTransaction(id: number): Promise<void>;

  // Category Rules
  getCategoryRulesByWorkspace(workspaceId: number): Promise<CategoryRule[]>;
  createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule>;
  updateCategoryRule(id: number, rule: Partial<InsertCategoryRule>): Promise<CategoryRule>;
  deleteCategoryRule(id: number): Promise<void>;

  // Public APIs
  getActiveSubscriptionPackages(): Promise<SubscriptionPackage[]>;

  // Analytics methods
  getAnalyticsData(workspaceId: number, timeframe: string): Promise<any>;
  getFinancialHealthData(workspaceId: number): Promise<any>;
  checkDebtReminders(workspaceId: number): Promise<any[]>;
  checkBudgetAlerts(workspaceId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Workspaces
  async getWorkspace(id: number): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async getUserWorkspaces(userId: number): Promise<Workspace[]> {
    const results = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        type: workspaces.type,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    return results;
  }

  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const [workspace] = await db.insert(workspaces).values(insertWorkspace).returning();

    // Add the owner as a member
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: workspace.ownerId,
      role: 'owner'
    });

    return workspace;
  }

  // Workspace Members
  async getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    return await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [workspaceMember] = await db.insert(workspaceMembers).values(member).returning();
    return workspaceMember;
  }

  // Categories
  async getWorkspaceCategories(workspaceId: number): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.workspaceId, workspaceId));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Accounts
  async getWorkspaceAccounts(workspaceId: number): Promise<Account[]> {
    const workspaceAccounts = await db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId));

    // Calculate balance from transactions for each account
    const accountsWithCalculatedBalance = await Promise.all(
      workspaceAccounts.map(async (account: any) => {
        const accountTransactions = await db
          .select()
          .from(transactions)
          .where(eq(transactions.accountId, account.id));

        // Get all transfer transactions where this account is the destination
        const incomingTransfers = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.toAccountId, account.id),
              eq(transactions.type, 'transfer')
            )
          );

        // Calculate balance: income and debt add, expense and repayment subtract
        const calculatedBalance = accountTransactions.reduce((sum: number, transaction: any) => {
          const amount = parseFloat(transaction.amount);
          if (transaction.type === 'income' || transaction.type === 'debt') {
            return sum + amount;
          } else if (transaction.type === 'expense' || transaction.type === 'repayment') {
            return sum - amount;
          } else if (transaction.type === 'transfer') {
            // If this account is the source account, subtract
            if (transaction.accountId === account.id) {
              return sum - amount;
            }
          }
          return sum;
        }, 0);

        // Add incoming transfers
        const incomingTransferAmount = incomingTransfers.reduce((sum: number, transfer: any) => {
          return sum + parseFloat(transfer.amount);
        }, 0);

        const finalBalance = calculatedBalance + incomingTransferAmount;

        return {
          ...account,
          balance: finalBalance.toString()
        };
      })
    );

    return accountsWithCalculatedBalance;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account> {
    console.log("Updating account in database:", id, account);
    const [updatedAccount] = await db
      .update(accounts)
      .set(account)
      .where(eq(accounts.id, id))
      .returning();
    
    if (!updatedAccount) {
      throw new Error(`Account with id ${id} not found`);
    }
    
    console.log("Account updated successfully:", updatedAccount);
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Transactions
  async getWorkspaceTransactions(workspaceId: number, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.workspaceId, workspaceId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async getAccountTransactions(accountId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    let transactionToCreate = { ...transaction };
    
    // Auto-create debt record if this is a new debt transaction and no debtId provided
    if (transaction.type === 'debt' && !transaction.debtId) {
      const newDebt = await this.createDebt({
        name: transaction.description || 'New Debt',
        type: 'debt',
        totalAmount: transaction.amount,
        remainingAmount: transaction.amount,
        status: 'active',
        workspaceId: transaction.workspaceId,
      });
      transactionToCreate.debtId = newDebt.id;
    }
    
    const [newTransaction] = await db.insert(transactions).values(transactionToCreate).returning();

    // Update account balance
    const account = await this.getAccount(transaction.accountId);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      let newBalance = currentBalance;

      if (transaction.type === 'income') {
        newBalance += parseFloat(transaction.amount);
      } else if (transaction.type === 'expense') {
        newBalance -= parseFloat(transaction.amount);
      } else if (transaction.type === 'debt') {
        // For new debt: money comes into account
        newBalance += parseFloat(transaction.amount);
      } else if (transaction.type === 'repayment') {
        // For repayment: money goes out of account
        newBalance -= parseFloat(transaction.amount);
        
        // Update debt remaining amount if debtId is provided
        if (transaction.debtId) {
          await this.updateDebtRepayment(transaction.debtId, parseFloat(transaction.amount));
        }
      } else if (transaction.type === 'transfer' && transaction.toAccountId) {
        // For transfer, only subtract from source account
        // The destination account balance will be calculated by getWorkspaceAccounts
        newBalance -= parseFloat(transaction.amount);
      }

      await this.updateAccount(transaction.accountId, { balance: newBalance.toString() });
    }

    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(transaction)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async getTransaction(id: number): Promise<any> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Budgets
  async getWorkspaceBudgets(workspaceId: number, year: number, month?: number): Promise<Budget[]> {
    let conditions = [eq(budgets.workspaceId, workspaceId), eq(budgets.year, year)];

    if (month) {
      conditions.push(eq(budgets.month, month));
    }

    return await db
      .select()
      .from(budgets)
      .where(and(...conditions));
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [newBudget] = await db.insert(budgets).values(budget).returning();
    return newBudget;
  }

  async updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(budget)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }

  async deleteBudget(id: number): Promise<void> {
    await db.delete(budgets).where(eq(budgets.id, id));
  }

  // Debts
  async getWorkspaceDebts(workspaceId: number): Promise<Debt[]> {
    return await db.select().from(debts).where(eq(debts.workspaceId, workspaceId));
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const [newDebt] = await db.insert(debts).values(debt).returning();
    return newDebt;
  }

  async updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt> {
    const [updatedDebt] = await db
      .update(debts)
      .set(debt)
      .where(eq(debts.id, id))
      .returning();
    return updatedDebt;
  }

  async deleteDebt(id: number): Promise<void> {
    await db.delete(debts).where(eq(debts.id, id));
  }

  async getDebtById(id: number): Promise<Debt | null> {
    const result = await db.select().from(debts).where(eq(debts.id, id));
    return result[0] || null;
  }

  // Get repayment transactions for a specific debt
  async getDebtRepayments(debtId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(and(
        eq(transactions.debtId, debtId),
        eq(transactions.type, 'repayment')
      ))
      .orderBy(desc(transactions.date));
  }

  // Update debt remaining amount when repayment is made
  async updateDebtRepayment(debtId: number, repaymentAmount: number): Promise<void> {
    const debt = await db.select().from(debts).where(eq(debts.id, debtId)).then(rows => rows[0]);
    if (!debt) {
      throw new Error('Debt not found');
    }

    const currentRemaining = parseFloat(debt.remainingAmount);
    const newRemaining = Math.max(0, currentRemaining - repaymentAmount);
    
    // Update status if fully paid
    const newStatus = newRemaining === 0 ? 'paid' : debt.status;
    
    await db.update(debts)
      .set({ 
        remainingAmount: newRemaining.toString(),
        status: newStatus 
      })
      .where(eq(debts.id, debtId));
  }



  // Dashboard data
  async getDashboardData(workspaceId: number): Promise<{
    totalBalance: string;
    monthlyIncome: string;
    monthlyExpenses: string;
    netWorth: string;
    recentTransactions: Transaction[];
  }> {
    // Get total balance from all accounts
    const accountsResult = await db
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.workspaceId, workspaceId));

    const totalBalance = accountsResult.reduce((sum: number, account: any) => sum + parseFloat(account.balance), 0);

    // Get current month's income and expenses
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const monthlyIncomeResult = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, workspaceId),
          eq(transactions.type, 'income'),
          sql`${transactions.date} >= ${firstDayOfMonth}`
        )
      );

    const monthlyIncome = monthlyIncomeResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const monthlyExpensesResult = await db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.workspaceId, workspaceId),
          eq(transactions.type, 'expense'),
          sql`${transactions.date} >= ${firstDayOfMonth}`
        )
      );

    const monthlyExpenses = monthlyExpensesResult.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    // Get recent transactions
    const recentTransactions = await this.getWorkspaceTransactions(workspaceId, 10);

    return {
      totalBalance: totalBalance.toString(),
      monthlyIncome: monthlyIncome.toString(),
      monthlyExpenses: monthlyExpenses.toString(),
      netWorth: totalBalance.toString(), // Simplified calculation
      recentTransactions,
    };
  }

  // RBAC - Roles
  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole).returning();
    return role;
  }

  async updateRole(id: number, role: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db.update(roles).set(role).where(eq(roles.id, id)).returning();
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // RBAC - Permissions
  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions);
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission || undefined;
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const [permission] = await db.insert(permissions).values(insertPermission).returning();
    return permission;
  }

  async updatePermission(id: number, permission: Partial<InsertPermission>): Promise<Permission> {
    const [updatedPermission] = await db.update(permissions).set(permission).where(eq(permissions.id, id)).returning();
    return updatedPermission;
  }

  async deletePermission(id: number): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  // RBAC - Role Permissions
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const results = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        resource: permissions.resource,
        action: permissions.action,
        createdAt: permissions.createdAt,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return results as Permission[];
  }

  async addRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [result] = await db.insert(rolePermissions).values(rolePermission).returning();
    return result;
  }

  async removeRolePermission(roleId: number, permissionId: number): Promise<void> {
    await db.delete(rolePermissions).where(
      and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      )
    );
  }

  // Subscription Packages
  async getAllSubscriptionPackages(): Promise<SubscriptionPackage[]> {
    return await db.select().from(subscriptionPackages);
  }

  async getSubscriptionPackage(id: number): Promise<SubscriptionPackage | undefined> {
    const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, id));
    return pkg || undefined;
  }

  async createSubscriptionPackage(subscriptionPackage: InsertSubscriptionPackage): Promise<SubscriptionPackage> {
    const [pkg] = await db.insert(subscriptionPackages).values(subscriptionPackage).returning();
    return pkg;
  }

  async updateSubscriptionPackage(id: number, subscriptionPackage: Partial<InsertSubscriptionPackage>): Promise<SubscriptionPackage> {
    const [updatedPackage] = await db.update(subscriptionPackages).set(subscriptionPackage).where(eq(subscriptionPackages.id, id)).returning();
    return updatedPackage;
  }

  async deleteSubscriptionPackage(id: number): Promise<void> {
    await db.delete(subscriptionPackages).where(eq(subscriptionPackages.id, id));
  }

  // User Subscriptions
  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return subscription || undefined;
  }

  async getUserSubscriptionWithPackage(userId: number): Promise<{subscription: UserSubscription, package: SubscriptionPackage} | undefined> {
    const [result] = await db
      .select({
        subscription: userSubscriptions,
        package: subscriptionPackages,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPackages, eq(userSubscriptions.packageId, subscriptionPackages.id))
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    return result || undefined;
  }

  async createUserSubscription(insertSubscription: InsertUserSubscription): Promise<UserSubscription> {
    const [subscription] = await db.insert(userSubscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateUserSubscription(id: number, subscription: Partial<InsertUserSubscription>): Promise<UserSubscription> {
    const [updatedSubscription] = await db.update(userSubscriptions).set(subscription).where(eq(userSubscriptions.id, id)).returning();
    return updatedSubscription;
  }

  // User Management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserWithRole(id: number): Promise<User & { role: Role } | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        password: users.password,
        roleId: users.roleId,
        createdAt: users.createdAt,
        roleData: roles
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id));

    if (!result) return undefined;

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      password: result.password,
      roleId: result.roleId,
      createdAt: result.createdAt,
      role: result.roleData
    };
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Subscription validation
  async getUserSubscriptionLimits(userId: number): Promise<UserSubscriptionLimitSummary | null> {
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);
    const userWorkspaces = await this.getUserWorkspaces(userId);

    const ownedWorkspaces = userWorkspaces.filter((workspace) => workspace.ownerId === userId);
    const ownedPersonalWorkspaces = ownedWorkspaces.filter((workspace) => workspace.type !== 'shared').length;
    const ownedSharedWorkspaces = ownedWorkspaces.filter((workspace) => workspace.type === 'shared').length;
    const invitedSharedWorkspaces = userWorkspaces.filter((workspace) => workspace.type === 'shared' && workspace.ownerId !== userId).length;

    if (userSubResult) {
      const personalLimit = userSubResult.package.maxWorkspaces ?? null;
      const sharedLimit = userSubResult.package.canCreateSharedWorkspace
        ? userSubResult.package.maxSharedWorkspaces ?? null
        : 0;

      const personalRemaining = personalLimit === null ? null : Math.max(personalLimit - ownedPersonalWorkspaces, 0);
      const sharedRemaining = sharedLimit === null ? null : Math.max(sharedLimit - ownedSharedWorkspaces, 0);

      return {
        maxWorkspaces: personalLimit,
        maxMembers: userSubResult.package.maxMembers,
        maxSharedWorkspaces: sharedLimit,
        canCreateSharedWorkspace: userSubResult.package.canCreateSharedWorkspace,
        currentWorkspaces: ownedPersonalWorkspaces + ownedSharedWorkspaces,
        breakdown: {
          personal: {
            used: ownedPersonalWorkspaces,
            limit: personalLimit,
            remaining: personalRemaining,
          },
          shared: {
            used: ownedSharedWorkspaces,
            limit: sharedLimit,
            remaining: sharedLimit === 0 ? 0 : sharedRemaining,
          },
          sharedInvitations: {
            used: invitedSharedWorkspaces,
          },
        },
      };
    }

    const personalLimit = 1;
    const sharedLimit = 0;
    const personalRemaining = personalLimit - ownedPersonalWorkspaces;

    return {
      maxWorkspaces: personalLimit,
      maxMembers: 1,
      maxSharedWorkspaces: sharedLimit,
      canCreateSharedWorkspace: false,
      currentWorkspaces: ownedPersonalWorkspaces,
      breakdown: {
        personal: {
          used: ownedPersonalWorkspaces,
          limit: personalLimit,
          remaining: Math.max(personalRemaining, 0),
        },
        shared: {
          used: ownedSharedWorkspaces,
          limit: sharedLimit,
          remaining: 0,
        },
        sharedInvitations: {
          used: invitedSharedWorkspaces,
        },
      },
    };
  }

  // Account, Category & Budget Limits Validation
  async checkAccountLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }> {
    // Get user subscription with package
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Get current category count
    const currentAccounts = await this.getWorkspaceAccounts(workspaceId);
    const current = currentAccounts.length;

    if (userSubResult) {
      // Check package limit (null means unlimited)
      const limit = userSubResult.package.maxAccounts;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current };
    } else {
      // Default basic package limits for users without subscription
      const limit = 2; // Basic package max accounts
      const canCreate = current < limit;
      return { canCreate, limit, current };
    }
  }

  async checkCategoryLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }> {
    // Get user subscription with package
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Get current category count
    const currentCategories = await this.getWorkspaceCategories(workspaceId);
    const current = currentCategories.length;

    if (userSubResult) {
      // Check package limit (null means unlimited)
      const limit = userSubResult.package.maxCategories;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current };
    } else {
      // Default basic package limits for users without subscription
      const limit = 3; // Basic package max categories
      const canCreate = current < limit;
      return { canCreate, limit, current };
    }
  }

  async checkBudgetLimit(workspaceId: number, userId: number, year: number, month?: number): Promise<{ canCreate: boolean; limit: number | null; current: number }> {
    // Get user subscription with package
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Get current budget count for the year/month
    const currentBudgets = await this.getWorkspaceBudgets(workspaceId, year, month);
    const current = currentBudgets.length;

    if (userSubResult) {
      // Check package limit (null means unlimited)
      const limit = userSubResult.package.maxBudgets;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current };
    } else {
      // Default basic package limits for users without subscription
      const limit = 2; // Basic package max budgets per period
      const canCreate = current < limit;
      return { canCreate, limit, current };
    }
  }

  async canCreateWorkspace(userId: number): Promise<boolean> {
    const limits = await this.getUserSubscriptionLimits(userId);
    if (!limits) return false;

    const personalLimit = limits.breakdown.personal.limit;
    if (personalLimit === null) {
      return true;
    }

    return limits.breakdown.personal.used < personalLimit;
  }

  // Workspace Subscriptions
  async getWorkspaceSubscription(workspaceId: number): Promise<WorkspaceSubscription | undefined> {
    const [subscription] = await db.select().from(workspaceSubscriptions).where(eq(workspaceSubscriptions.workspaceId, workspaceId));
    return subscription || undefined;
  }

  async getWorkspaceSubscriptionWithPackage(workspaceId: number): Promise<{subscription: WorkspaceSubscription, package: SubscriptionPackage} | undefined> {
    const [result] = await db
      .select({
        subscription: workspaceSubscriptions,
        package: subscriptionPackages,
      })
      .from(workspaceSubscriptions)
      .innerJoin(subscriptionPackages, eq(workspaceSubscriptions.packageId, subscriptionPackages.id))
      .where(eq(workspaceSubscriptions.workspaceId, workspaceId));

    return result || undefined;
  }

  async createWorkspaceSubscription(insertSubscription: InsertWorkspaceSubscription): Promise<WorkspaceSubscription> {
    const [subscription] = await db.insert(workspaceSubscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateWorkspaceSubscription(id: number, subscription: Partial<InsertWorkspaceSubscription>): Promise<WorkspaceSubscription> {
    const [updatedSubscription] = await db.update(workspaceSubscriptions).set(subscription).where(eq(workspaceSubscriptions.id, id)).returning();
    return updatedSubscription;
  }

  async getUserOwnedWorkspaceSubscriptions(userId: number): Promise<{subscription: WorkspaceSubscription, package: SubscriptionPackage, workspace: Workspace}[]> {
    const results = await db
      .select({
        subscription: workspaceSubscriptions,
        package: subscriptionPackages,
        workspace: workspaces,
      })
      .from(workspaceSubscriptions)
      .innerJoin(subscriptionPackages, eq(workspaceSubscriptions.packageId, subscriptionPackages.id))
      .innerJoin(workspaces, eq(workspaceSubscriptions.workspaceId, workspaces.id))
      .where(eq(workspaceSubscriptions.ownerId, userId));

    return results;
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    // Get user's role
    const user = await this.getUser(userId);
    if (!user) return [];

    // Get permissions for user's role
    const userRolePermissions = await db
      .select({
        permission: permissions.name
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user.roleId));

    return userRolePermissions.map(rp => rp.permission);
  }

  // Settings
  async getAppSettings(): Promise<AppSettings> {
    const [settings] = await db.select().from(appSettings).limit(1);
    
    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await db.insert(appSettings).values({}).returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    const currentSettings = await this.getAppSettings();
    
    const [updatedSettings] = await db
      .update(appSettings)
      .set({
        ...settings,
        updatedAt: new Date()
      })
      .where(eq(appSettings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }

  // Public APIs
  async getActiveSubscriptionPackages(): Promise<SubscriptionPackage[]> {
    return await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.isActive, true));
  }

  // Analytics methods
  async getAnalyticsData(workspaceId: number, timeframe: string): Promise<any> {
    const transactions = await this.getWorkspaceTransactions(workspaceId, 1000);
    const categories = await this.getWorkspaceCategories(workspaceId);
    const budgets = await this.getWorkspaceBudgets(workspaceId);
    
    // Calculate timeframe boundaries
    const now = new Date();
    let months = 6;
    if (timeframe === '12months') months = 12;
    if (timeframe === '3months') months = 3;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // Filter transactions within timeframe
    const filteredTransactions = transactions.filter(t => new Date(t.date) >= startDate);
    
    // Generate spending trends by month
    const spendingTrends = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      spendingTrends.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        income,
        expenses,
        savings: income - expenses
      });
    }
    
    // Generate category analysis
    const categoryMap = new Map();
    categories.forEach(cat => categoryMap.set(cat.id, cat.name));
    
    const categorySpending = new Map();
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const categoryName = categoryMap.get(t.categoryId) || 'Uncategorized';
        const current = categorySpending.get(categoryName) || 0;
        categorySpending.set(categoryName, current + parseFloat(t.amount));
      });
    
    const totalExpenses = Array.from(categorySpending.values()).reduce((sum, amount) => sum + amount, 0);
    const categoryData = Array.from(categorySpending.entries()).map(([name, value]) => ({
      name,
      value,
      percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0
    }));
    
    // Budget comparison
    const budgetComparison = budgets.map(budget => {
      const categoryName = categoryMap.get(budget.categoryId) || 'Unknown';
      const spent = categorySpending.get(categoryName) || 0;
      const budgetAmount = parseFloat(budget.amount);
      
      return {
        category: categoryName,
        budget: budgetAmount,
        spent,
        remaining: budgetAmount - spent,
        percentage: budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
      };
    });
    
    return {
      timeframe,
      spendingTrends,
      categoryData: categoryData.slice(0, 10), // Top 10 categories
      cashFlowForecast: spendingTrends, // Reuse for forecast
      budgetComparison
    };
  }

  async getFinancialHealthData(workspaceId: number): Promise<any> {
    // Get all transactions for the workspace
    const transactions = await this.getWorkspaceTransactions(workspaceId, 1000);
    const accounts = await this.getWorkspaceAccounts(workspaceId);
    const debts = await this.getWorkspaceDebts(workspaceId);
    
    // Calculate total balance
    const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
    
    // Calculate total debt
    const totalDebt = debts
      .filter(debt => debt.type === 'debt')
      .reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
    
    // Calculate monthly income and expenses
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });
    
    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Calculate ratios
    const debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : 0;
    const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;
    
    // Calculate financial health score (0-100)
    let score = 0;
    
    // For fresh accounts with no transactions, start with base score
    if (transactions.length === 0) {
      score = 50; // Base score for new accounts
    } else {
      // Start with base score and add points for good financial health
      score = 30; // Base score for active accounts
      
      // Add points for good debt-to-income ratio
      if (debtToIncomeRatio === 0) score += 25;
      else if (debtToIncomeRatio < 0.2) score += 20;
      else if (debtToIncomeRatio < 0.3) score += 10;
      else if (debtToIncomeRatio > 0.4) score -= 10;
      
      // Add points for good savings rate
      if (savingsRate >= 0.2) score += 25;
      else if (savingsRate >= 0.1) score += 15;
      else if (savingsRate < 0) score -= 15;
      
      // Add points for emergency fund
      if (totalBalance >= monthlyExpenses * 6) score += 20;
      else if (totalBalance >= monthlyExpenses * 3) score += 15;
      else if (totalBalance >= monthlyExpenses * 1) score += 10;
      else if (monthlyExpenses > 0 && totalBalance < monthlyExpenses * 0.5) score -= 10;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      debtToIncomeRatio,
      savingsRate,
      budgetCompliance: transactions.length > 0 ? 0.82 : 0, // Only show compliance if there are transactions
      totalBalance,
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      trends: {
        score: 'stable',
        debtRatio: 'improving',
        savings: 'stable'
      }
    };
  }

  // Notification methods
  // Notifications methods  
  async getNotificationsByWorkspace(workspaceId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.workspaceId, workspaceId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async executeRecurringTransactions(): Promise<void> {
    const now = new Date();
    
    // Get all active recurring transactions that are due
    const dueTransactions = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.isActive, true)
        )
      );

    for (const recurring of dueTransactions) {
      // Check if it's time to execute
      const nextExecution = new Date(recurring.nextExecution || now);
      if (nextExecution <= now) {
        try {
          // Create the transaction
          const transactionData = {
            workspaceId: recurring.workspaceId,
            accountId: recurring.accountId,
            categoryId: recurring.categoryId,
            type: recurring.type,
            amount: recurring.amount,
            description: `${recurring.name} - Automated`,
            date: now,
          };

          await db.insert(transactions).values([transactionData]);

          // Update next execution
          let nextExec: Date;
          switch (recurring.frequency) {
            case 'daily': nextExec = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
            case 'weekly': nextExec = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
            case 'monthly': nextExec = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
            case 'yearly': nextExec = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); break;
            default: nextExec = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          }

          await db
            .update(recurringTransactions)
            .set({
              lastExecuted: now,
              nextExecution: nextExec,
            })
            .where(eq(recurringTransactions.id, recurring.id));
        } catch (error) {
          console.error(`Failed to execute recurring transaction ${recurring.id}:`, error);
        }
      }
    }
  }

  async checkDebtReminders(workspaceId: number): Promise<any[]> {
    const debts = await this.getWorkspaceDebts(workspaceId);
    const reminders = [];
    const now = new Date();
    
    for (const debt of debts) {
      if (debt.status === 'active' && debt.dueDate) {
        const dueDate = new Date(debt.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Check if reminder should be sent (7, 3, 1 days before)
        if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
          reminders.push({
            debtId: debt.id,
            debtName: debt.name,
            daysLeft: diffDays,
            amount: parseFloat(debt.remainingAmount),
            dueDate: debt.dueDate
          });
        }
      }
    }
    
    return reminders;
  }

  async checkBudgetAlerts(workspaceId: number): Promise<any[]> {
    const budgets = await this.getWorkspaceBudgets(workspaceId, new Date().getFullYear(), new Date().getMonth() + 1);
    const alerts = [];
    
    for (const budget of budgets) {
      // Get current month transactions for this category
      const transactions = await this.getWorkspaceTransactions(workspaceId, 1000);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const categorySpending = transactions
        .filter(t => {
          const transactionDate = new Date(t.date);
          return t.categoryId === budget.categoryId &&
                 t.type === 'expense' &&
                 transactionDate.getMonth() === currentMonth &&
                 transactionDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const budgetAmount = parseFloat(budget.amount);
      const percentage = budgetAmount > 0 ? (categorySpending / budgetAmount) * 100 : 0;
      
      // Alert at 80%, 90%, and 100%+
      if (percentage >= 80) {
        const category = await db.select().from(categories).where(eq(categories.id, budget.categoryId)).then(rows => rows[0]);
        alerts.push({
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Unknown',
          percentage,
          budgetAmount,
          spentAmount: categorySpending
        });
      }
    }
    
    return alerts;
  }

  // Enhanced Goals methods with AI integration
  async getGoalsByWorkspace(workspaceId: number): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.workspaceId, workspaceId))
      .orderBy(desc(goals.priority), desc(goals.createdAt));
  }

  async getGoalWithDetails(goalId: number): Promise<Goal & {
    linkedAccount?: Account;
    linkedDebt?: Debt;
    contributions: GoalContribution[];
    milestones: GoalMilestone[];
    insights: GoalInsight[];
  } | null> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, goalId));

    if (!goal) return null;

    // Get linked account if exists
    let linkedAccount = null;
    if (goal.linkedAccountId) {
      [linkedAccount] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, goal.linkedAccountId));
    }

    // Get linked debt if exists
    let linkedDebt = null;
    if (goal.linkedDebtId) {
      [linkedDebt] = await db
        .select()
        .from(debts)
        .where(eq(debts.id, goal.linkedDebtId));
    }

    // Get contributions
    const contributions = await db
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId))
      .orderBy(desc(goalContributions.date));

    // Get milestones
    const milestones = await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(asc(goalMilestones.order));

    // Get insights
    const insights = await db
      .select()
      .from(goalInsights)
      .where(eq(goalInsights.goalId, goalId))
      .orderBy(desc(goalInsights.createdAt))
      .limit(10);

    return {
      ...goal,
      linkedAccount: linkedAccount || undefined,
      linkedDebt: linkedDebt || undefined,
      contributions,
      milestones,
      insights
    };
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db.insert(goals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set({ ...goal, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    // Delete related records first
    await db.delete(goalContributions).where(eq(goalContributions.goalId, id));
    await db.delete(goalMilestones).where(eq(goalMilestones.goalId, id));
    await db.delete(goalInsights).where(eq(goalInsights.goalId, id));
    
    // Delete the goal
    await db.delete(goals).where(eq(goals.id, id));
  }



  // Goal Contributions methods
  async getGoalContributions(goalId: number, limit: number = 100): Promise<GoalContribution[]> {
    return await db
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.goalId, goalId))
      .orderBy(desc(goalContributions.date))
      .limit(limit);
  }

  async createGoalContribution(contribution: InsertGoalContribution): Promise<GoalContribution> {
    const [newContribution] = await db.insert(goalContributions).values(contribution).returning();
    return newContribution;
  }

  // Goal Milestones methods
  async getGoalMilestones(goalId: number): Promise<GoalMilestone[]> {
    return await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(asc(goalMilestones.order));
  }

  async createGoalMilestone(milestone: InsertGoalMilestone): Promise<GoalMilestone> {
    const [newMilestone] = await db.insert(goalMilestones).values(milestone).returning();
    return newMilestone;
  }

  async updateGoalMilestone(id: number, milestone: Partial<InsertGoalMilestone>): Promise<GoalMilestone> {
    const [updatedMilestone] = await db
      .update(goalMilestones)
      .set(milestone)
      .where(eq(goalMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteGoalMilestone(id: number): Promise<void> {
    await db.delete(goalMilestones).where(eq(goalMilestones.id, id));
  }

  // Goal Insights methods
  async getGoalInsights(goalId: number): Promise<GoalInsight[]> {
    return await db
      .select()
      .from(goalInsights)
      .where(eq(goalInsights.goalId, goalId))
      .orderBy(desc(goalInsights.createdAt));
  }

  async getWorkspaceGoalInsights(workspaceId: number, limit: number = 50): Promise<GoalInsight[]> {
    return await db
      .select()
      .from(goalInsights)
      .where(eq(goalInsights.workspaceId, workspaceId))
      .orderBy(desc(goalInsights.createdAt))
      .limit(limit);
  }

  async createGoalInsight(insight: InsertGoalInsight): Promise<GoalInsight> {
    const [newInsight] = await db.insert(goalInsights).values(insight).returning();
    return newInsight;
  }

  async markGoalInsightAsRead(id: number): Promise<GoalInsight> {
    const [updatedInsight] = await db
      .update(goalInsights)
      .set({ isRead: true })
      .where(eq(goalInsights.id, id))
      .returning();
    return updatedInsight;
  }

  // Advanced Goals Analytics
  async getGoalPerformanceMetrics(workspaceId: number): Promise<any> {
    const workspaceGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.workspaceId, workspaceId));

    const metrics = {
      totalGoals: workspaceGoals.length,
      activeGoals: workspaceGoals.filter(g => g.status === 'active').length,
      completedGoals: workspaceGoals.filter(g => g.status === 'completed').length,
      pausedGoals: workspaceGoals.filter(g => g.status === 'paused').length,
      
      totalTargetAmount: workspaceGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0),
      totalCurrentAmount: workspaceGoals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0),
      
      averageProgress: workspaceGoals.length > 0 
        ? workspaceGoals.reduce((sum, g) => {
            const progress = parseFloat(g.currentAmount) / parseFloat(g.targetAmount);
            return sum + (progress * 100);
          }, 0) / workspaceGoals.length
        : 0,
        
      goalsByType: {
        savings: workspaceGoals.filter(g => g.type === 'savings').length,
        debt_payment: workspaceGoals.filter(g => g.type === 'debt_payment').length,
        investment: workspaceGoals.filter(g => g.type === 'investment').length,
        emergency_fund: workspaceGoals.filter(g => g.type === 'emergency_fund').length,
        retirement: workspaceGoals.filter(g => g.type === 'retirement').length,
      },
      
      goalsByPriority: {
        critical: workspaceGoals.filter(g => g.priority === 'critical').length,
        high: workspaceGoals.filter(g => g.priority === 'high').length,
        medium: workspaceGoals.filter(g => g.priority === 'medium').length,
        low: workspaceGoals.filter(g => g.priority === 'low').length,
      }
    };

    return metrics;
  }

  // Smart Goal Recommendations
  async getSmartGoalSuggestions(workspaceId: number): Promise<any[]> {
    const financialHealth = await this.getWorkspaceFinancialHealth(workspaceId);
    const existingGoals = await this.getGoalsByWorkspace(workspaceId);
    const suggestions = [];

    // Emergency Fund Check
    const hasEmergencyFund = existingGoals.some(g => g.type === 'emergency_fund' && g.status === 'active');
    if (!hasEmergencyFund && financialHealth.totalBalance < financialHealth.monthlyExpenses * 6) {
      suggestions.push({
        type: 'emergency_fund',
        title: 'Build Emergency Fund',
        description: 'Create a safety net for unexpected expenses',
        recommendedAmount: financialHealth.monthlyExpenses * 6,
        priority: 'critical',
        reasoning: 'You currently don\'t have sufficient emergency savings. Experts recommend 6 months of expenses.',
        confidence: 0.95
      });
    }

    // Debt Payoff Strategy
    const hasDebtGoals = existingGoals.some(g => g.type === 'debt_payment');
    if (!hasDebtGoals && financialHealth.totalDebt > 0) {
      suggestions.push({
        type: 'debt_payment',
        title: 'Accelerate Debt Payoff',
        description: 'Create a focused debt elimination plan',
        recommendedAmount: financialHealth.totalDebt * 0.15, // 15% extra payment
        priority: 'high',
        timeline: '24 months',
        reasoning: `You have ${financialHealth.totalDebt.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })} in debt. Paying extra can save significant interest.`,
        confidence: 0.85
      });
    }

    // Investment Goals
    if (hasEmergencyFund && financialHealth.monthlyIncome > financialHealth.monthlyExpenses * 1.5) {
      suggestions.push({
        type: 'investment',
        title: 'Start Investment Portfolio',
        description: 'Begin building long-term wealth through investments',
        recommendedAmount: financialHealth.monthlyIncome * 0.2 * 12, // 20% of annual income
        priority: 'medium',
        timeline: '12 months',
        reasoning: 'You have stable finances and emergency fund. Time to grow wealth through investments.',
        confidence: 0.75
      });
    }

    return suggestions;
  }

  // Financial Health Analysis for Goals
  async getWorkspaceFinancialHealth(workspaceId: number): Promise<any> {
    const accounts = await this.getWorkspaceAccounts(workspaceId);
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const transactions = await this.getWorkspaceTransactions(workspaceId, 1000);
    const debts = await this.getWorkspaceDebts(workspaceId);

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalDebt = debts.reduce((sum, debt) => sum + parseFloat(debt.remainingAmount), 0);
    
    // Filter transactions from last 30 days
    const recentTransactions = transactions.filter(t => new Date(t.date) >= startDate);
    
    const monthlyExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
    const monthlyIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      totalBalance,
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      netWorth: totalBalance - totalDebt,
      savingsRate: monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0
    };
  }

  // Helper methods
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Recurring Transactions methods
  async getRecurringTransactionsByWorkspace(workspaceId: number): Promise<RecurringTransaction[]> {
    return await db.select().from(recurringTransactions)
      .where(eq(recurringTransactions.workspaceId, workspaceId))
      .orderBy(desc(recurringTransactions.createdAt));
  }

  async createRecurringTransaction(transaction: any): Promise<RecurringTransaction> {
    const [newTransaction] = await db.insert(recurringTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateRecurringTransaction(id: number, transaction: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction> {
    const [updatedTransaction] = await db
      .update(recurringTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteRecurringTransaction(id: number): Promise<void> {
    await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
  }

  // Category Rules methods
  async getCategoryRulesByWorkspace(workspaceId: number): Promise<CategoryRule[]> {
    return await db.select().from(categoryRules)
      .where(eq(categoryRules.workspaceId, workspaceId))
      .orderBy(desc(categoryRules.createdAt));
  }

  async createCategoryRule(rule: InsertCategoryRule): Promise<CategoryRule> {
    const [newRule] = await db.insert(categoryRules).values(rule).returning();
    return newRule;
  }

  async updateCategoryRule(id: number, rule: Partial<InsertCategoryRule>): Promise<CategoryRule> {
    const [updatedRule] = await db
      .update(categoryRules)
      .set(rule)
      .where(eq(categoryRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteCategoryRule(id: number): Promise<void> {
    await db.delete(categoryRules).where(eq(categoryRules.id, id));
  }
}

export const storage = new DatabaseStorage();