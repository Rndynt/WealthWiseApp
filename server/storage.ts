import { eq, and, desc, sql } from 'drizzle-orm';
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
  userSubscriptions,
  appSettings,
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
  type AppSettings,
  type InsertAppSettings,
} from '@shared/schema';
import {
  type WorkspaceMember,
  type InsertWorkspaceMember,
} from "@shared/schema";

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
  getUserSubscriptionLimits(userId: number): Promise<{ maxWorkspaces: number; maxMembers: number; currentWorkspaces: number } | null>;
  canCreateWorkspace(userId: number): Promise<boolean>;

  // Account, Category & Budget Limits Validation
  checkAccountLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;
  checkCategoryLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;
  checkBudgetLimit(workspaceId: number, userId: number, year: number, month?: number): Promise<{ canCreate: boolean; limit: number | null; current: number }>;

  // Settings
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;

  // Public APIs
  getActiveSubscriptionPackages(): Promise<SubscriptionPackage[]>;
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

        // Calculate balance: income adds, expense subtracts
        const calculatedBalance = accountTransactions.reduce((sum: number, transaction: any) => {
          const amount = parseFloat(transaction.amount);
          return transaction.type === 'income' ? sum + amount : sum - amount;
        }, 0);

        return {
          ...account,
          balance: calculatedBalance.toString()
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
    const [updatedAccount] = await db
      .update(accounts)
      .set(account)
      .where(eq(accounts.id, id))
      .returning();
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
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();

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
        // Subtract from source account
        newBalance -= parseFloat(transaction.amount);

        // Add to destination account
        const toAccount = await this.getAccount(transaction.toAccountId);
        if (toAccount) {
          const toBalance = parseFloat(toAccount.balance) + parseFloat(transaction.amount);
          await this.updateAccount(transaction.toAccountId, { balance: toBalance.toString() });
        }
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

  // Get debt repayment history
  async getDebtRepayments(debtId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.debtId, debtId),
          eq(transactions.type, 'repayment')
        )
      )
      .orderBy(desc(transactions.date));
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
  async getUserSubscriptionLimits(userId: number): Promise<{ maxWorkspaces: number; maxMembers: number; currentWorkspaces: number } | null> {
    // Get current user subscription with package details
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Count current workspaces for this user
    const userWorkspaces = await this.getUserWorkspaces(userId);
    const currentWorkspaces = userWorkspaces.length;

    if (userSubResult) {
      // User has active subscription
      return {
        maxWorkspaces: userSubResult.package.maxWorkspaces,
        maxMembers: userSubResult.package.maxMembers,
        currentWorkspaces
      };
    } else {
      // User has no subscription (free/basic user) - gets 1 workspace only
      return {
        maxWorkspaces: 1,
        maxMembers: 1,
        currentWorkspaces
      };
    }
  }

  // Account, Category & Budget Limits Validation
  async checkAccountLimit(workspaceId: number, userId: number): Promise<{ canCreate: boolean; limit: number | null; current: number }> {
    // Get user subscription with package
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Get current category count
    const currentAccounts = await this.getWorkspaceAccounts(workspaceId);
    const current = currentAccounts.length;

    if (userSubResult) {
      const packageName = userSubResult.package.name;
      // Check package limit (null means unlimited)
      const limit = userSubResult.package.maxAccounts;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current, packageName };
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
      const packageName = userSubResult.package.name;
      const limit = userSubResult.package.maxCategories;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current, packageName };
    } else {
      // Default basic package limits for users without subscription
      const packageName = "basic";
      const limit = 3; // Basic package max categories
      const canCreate = current < limit;
      return { canCreate, limit, current, packageName };
    }
  }

  async checkBudgetLimit(workspaceId: number, userId: number, year: number, month?: number): Promise<{ canCreate: boolean; limit: number | null; current: number }> {
    // Get user subscription with package
    const userSubResult = await this.getUserSubscriptionWithPackage(userId);

    // Get current budget count for the year/month
    const currentBudgets = await this.getWorkspaceBudgets(workspaceId, year, month);
    const current = currentBudgets.length;

    if (userSubResult) {
      const packageName = userSubResult.package.name;
      // Check package limit (null means unlimited)
      const limit = userSubResult.package.maxBudgets;
      const canCreate = limit === null || current < limit;
      return { canCreate, limit, current, packageName };
    } else {
      // Default basic package limits for users without subscription
      const packageName = "basic";
      const limit = 2; // Basic package max budgets per period
      const canCreate = current < limit;
      return { canCreate, limit, current, packageName };
    }
  }

  async canCreateWorkspace(userId: number): Promise<boolean> {
    const limits = await this.getUserSubscriptionLimits(userId);
    if (!limits) return false;

    return limits.currentWorkspaces < limits.maxWorkspaces;
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
}

export const storage = new DatabaseStorage();