import { 
  users, workspaces, workspaceMembers, categories, accounts, transactions, budgets, debts,
  type User, type InsertUser, type Workspace, type InsertWorkspace, type WorkspaceMember,
  type InsertWorkspaceMember, type Category, type InsertCategory, type Account, type InsertAccount,
  type Transaction, type InsertTransaction, type Budget, type InsertBudget, type Debt, type InsertDebt
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

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
      .leftJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
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
    return await db.select().from(accounts).where(eq(accounts.workspaceId, workspaceId));
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
    
    const totalBalance = accountsResult.reduce((sum, account) => sum + parseFloat(account.balance), 0);

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
    
    const monthlyIncome = monthlyIncomeResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);

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
    
    const monthlyExpenses = monthlyExpensesResult.reduce((sum, t) => sum + parseFloat(t.amount), 0);

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
}

export const storage = new DatabaseStorage();
