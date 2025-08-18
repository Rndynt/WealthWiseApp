import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, insertWorkspaceSchema, insertCategorySchema, 
  insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertDebtSchema,
  insertRoleSchema, insertPermissionSchema, insertRolePermissionSchema,
  insertSubscriptionPackageSchema, insertUserSubscriptionSchema,
  insertGoalSchema, insertGoalMilestoneSchema, insertRecurringTransactionSchema, insertCategoryRuleSchema
} from "@shared/schema";
import { db } from "./db";
import { workspaceMembers as workspaceMembersTable } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
      };
    }
  }
}

const storage = new DatabaseStorage();
import { goalsService } from './goals-service';
import { aiGoalsService } from './ai-goals-service';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Smart notification triggers (excluding repayment processing to avoid double deduction)
async function checkNonRepaymentNotifications(workspaceId: number, transaction: any) {
  try {
    // Check for unusual transaction amounts
    const amount = parseFloat(transaction.amount);
    if (amount > 1000000) { // > 1M IDR
      console.log(`Unusual transaction detected: ${amount} IDR`);
    }
    
    // Check budget compliance if expense
    if (transaction.type === 'expense' && transaction.categoryId) {
      const currentYear = new Date().getFullYear();
      const budgets = await storage.getWorkspaceBudgets(workspaceId, currentYear);
      const categoryBudget = budgets.find(b => b.categoryId === transaction.categoryId);
      if (categoryBudget) {
        const spent = await calculateCategorySpending(workspaceId, transaction.categoryId);
        const budgetAmount = parseFloat(categoryBudget.amount);
        const percentage = (spent / budgetAmount) * 100;
        
        if (percentage >= 90) {
          console.log(`Budget alert: ${percentage.toFixed(0)}% spent in category`);
        }
      }
    }
    
    // Note: Debt repayment processing moved to main transaction creation logic
    // to prevent double deduction issues
  } catch (error) {
    console.error('Smart notification error:', error);
  }
}



async function calculateCategorySpending(workspaceId: number, categoryId: number): Promise<number> {
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const transactions = await storage.getWorkspaceTransactions(workspaceId, 1000);
  
  return transactions
    .filter(t => t.type === 'expense' && 
                 t.categoryId === categoryId && 
                 new Date(t.date) >= startOfMonth)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
}

// Middleware to verify JWT token
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Decoded JWT:', decoded); // Debug log
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error); // Debug log
    return res.status(403).json({ message: 'Invalid token' });
  }
}

// Permission middleware
const requirePermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUserWithRole(req.user.userId);
      
      // Root user bypass - has all permissions
      if (user?.role?.name === 'root' || user?.email === 'root@financeflow.com') {
        return next();
      }
      
      const permissions = await storage.getUserPermissions(req.user.userId);
      if (!permissions.includes(permission)) {
        return res.status(403).json({ message: "Akses ditolak. Permission tidak memadai." });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Gagal mengecek permission" });
    }
  };
};

// Role middleware
const requireRole = (roleName: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const role = await storage.getRole(user.roleId);
      if (!role || role.name !== roleName) {
        return res.status(403).json({ message: `Akses ditolak. Role ${roleName} diperlukan.` });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Gagal mengecek role" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user with basic role
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        roleId: 3, // user basic role ID from seeder
      });

      // Create default basic subscription for new user
      const now = new Date();
      const oneYearLater = new Date();
      oneYearLater.setFullYear(now.getFullYear() + 1);

      await storage.createUserSubscription({
        userId: user.id,
        packageId: 1, // Basic package ID from seeder
        startDate: now,
        endDate: oneYearLater,
        status: "active"
      });

      // Create personal workspace
      const workspace = await storage.createWorkspace({
        name: "Personal",
        type: "personal",
        ownerId: user.id,
      });

      // Basic package users start with 0 categories, they can create up to 3

      // Create default accounts with zero balance (calculated from transactions)
      const defaultAccounts = [
        { 
          name: "Bank BCA", 
          type: "transaction", 
          currency: "IDR", 
          balance: "0",
          notes: "Primary transaction account",
          workspaceId: workspace.id 
        },
        { 
          name: "Cash", 
          type: "transaction", 
          currency: "IDR", 
          balance: "0",
          notes: "Cash money",
          workspaceId: workspace.id 
        },
      ];

      for (const account of defaultAccounts) {
        await storage.createAccount(account);
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name },
        workspace: workspace
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User routes
  app.get("/api/user", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUserWithRole(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user permissions
      const permissions = await storage.getUserPermissions(req.user.userId);
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name,
        roleId: user.roleId,
        role: {
          id: user.role?.id,
          name: user.role?.name,
          permissions: permissions
        }
      });
    } catch (error) {
      console.error("Failed to get user with role:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/user/subscription-limits", authenticateToken, async (req: any, res) => {
    try {
      const limits = await storage.getUserSubscriptionLimits(req.user.userId);
      res.json(limits);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription limits" });
    }
  });

  app.get("/api/user/permissions", authenticateToken, async (req: any, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.user.userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.get("/api/user/role", authenticateToken, async (req: any, res) => {
    try {
      const userWithRole = await storage.getUserWithRole(req.user.userId);
      if (!userWithRole) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(userWithRole.role);
    } catch (error) {
      console.error("Failed to get user role:", error);
      res.status(500).json({ message: "Failed to get user role" });
    }
  });

  // Workspace routes
  app.get("/api/workspaces", authenticateToken, async (req: any, res) => {
    try {
      const workspaces = await storage.getUserWorkspaces(req.user.userId);
      res.json(workspaces);
    } catch (error) {
      res.status(500).json({ message: "Failed to get workspaces" });
    }
  });

  app.post("/api/workspaces", authenticateToken, async (req: any, res) => {
    try {
      const { type } = req.body; // 'personal' | 'shared'
      
      if (type === 'shared') {
        // Check if user can create shared workspaces
        const userSub = await storage.getUserSubscriptionWithPackage(req.user.userId);
        if (!userSub || !userSub.package.canCreateSharedWorkspace) {
          return res.status(403).json({ 
            message: "Anda perlu upgrade ke paket Professional atau Business untuk membuat shared workspace." 
          });
        }

        // Check shared workspace limits
        const ownedSharedSubs = await storage.getUserOwnedWorkspaceSubscriptions(req.user.userId);
        const maxSharedWorkspaces = userSub.package.maxSharedWorkspaces;
        
        if (maxSharedWorkspaces !== null && ownedSharedSubs.length >= maxSharedWorkspaces) {
          return res.status(403).json({ 
            message: `Anda telah mencapai batas maksimal shared workspace (${ownedSharedSubs.length}/${maxSharedWorkspaces}). Upgrade ke paket Business untuk unlimited shared workspace.` 
          });
        }
      } else {
        // Check personal workspace limits
        const canCreate = await storage.canCreateWorkspace(req.user.userId);
        if (!canCreate) {
          const limits = await storage.getUserSubscriptionLimits(req.user.userId);
          return res.status(403).json({ 
            message: "Anda telah mencapai batas maksimal workspace pribadi. Upgrade paket untuk membuat workspace lebih banyak.",
            limits 
          });
        }
      }

      const workspaceData = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: req.user.userId,
      });

      const workspace = await storage.createWorkspace(workspaceData);
      
      // If shared workspace, create workspace subscription
      if (type === 'shared') {
        const now = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(now.getMonth() + 1);

        await storage.createWorkspaceSubscription({
          workspaceId: workspace.id,
          packageId: 3, // Professional package by default for shared workspaces
          ownerId: req.user.userId,
          startDate: now,
          endDate: oneMonthLater,
          status: "active"
        });
      }
      
      res.json(workspace);
    } catch (error) {
      console.error("Workspace creation error:", error);
      res.status(400).json({ message: "Failed to create workspace" });
    }
  });

  // Collaboration routes: workspace members
  app.get('/api/workspaces/:workspaceId/members', authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const members = await storage.getWorkspaceMembers(workspaceId);
      const membersWithUser = await Promise.all(members.map(async (m) => {
        const u = await storage.getUser(m.userId);
        return {
          ...m,
          user: u ? { id: u.id, name: u.name, email: u.email } : { id: m.userId, name: 'Unknown', email: '' },
        };
      }));
      res.json(membersWithUser);
    } catch (error) {
      console.error('Failed to get workspace members:', error);
      res.status(500).json({ message: 'Failed to get members' });
    }
  });

  app.post('/api/workspaces/:workspaceId/invite', authenticateToken, requirePermission('collaboration.manage'), async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const { email, role } = req.body as { email: string; role: 'editor' | 'viewer' };
      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const name = email.split('@')[0];
        const hashedPassword = await bcrypt.hash('demo123', 10);
        user = await storage.createUser({
          email,
          password: hashedPassword,
          name,
          roleId: 3,
        });
      }

      const member = await storage.addWorkspaceMember({ workspaceId, userId: user.id, role });
      res.json({ ...member, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error('Failed to invite member:', error);
      res.status(400).json({ message: 'Failed to invite member' });
    }
  });

  app.put('/api/workspaces/:workspaceId/members/:memberId', authenticateToken, requirePermission('collaboration.manage'), async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body as { role: 'editor' | 'viewer' | 'owner' };
      const [updated] = await db.update(workspaceMembersTable).set({ role }).where(eq(workspaceMembersTable.id, memberId)).returning();
      res.json(updated);
    } catch (error) {
      console.error('Failed to update member role:', error);
      res.status(400).json({ message: 'Failed to update member role' });
    }
  });

  app.delete('/api/workspaces/:workspaceId/members/:memberId', authenticateToken, requirePermission('collaboration.manage'), async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.id, memberId));
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Failed to remove member:', error);
      res.status(400).json({ message: 'Failed to remove member' });
    }
  });

  // Category routes
  app.get("/api/workspaces/:workspaceId/categories", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const categories = await storage.getWorkspaceCategories(workspaceId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/workspaces/:workspaceId/categories", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);

      // Check category limits untuk basic package users
      const categoryLimit = await storage.checkCategoryLimit(workspaceId, req.user.userId);
      if (!categoryLimit.canCreate) {
        return res.status(403).json({
          message: `Anda telah mencapai batas maksimal kategori untuk paket basic (${categoryLimit.current}/${categoryLimit.limit}). Upgrade ke paket premium untuk kategori unlimited.`,
          limits: categoryLimit
        });
      }

      const categoryData = insertCategorySchema.parse({
        ...req.body,
        workspaceId,
      });

      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const category = await storage.updateCategory(id, updates);
      res.json(category);
    } catch (error) {
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Account routes
  app.get("/api/workspaces/:workspaceId/accounts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const accounts = await storage.getWorkspaceAccounts(workspaceId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.post("/api/workspaces/:workspaceId/accounts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);

      // Check category limits untuk basic package users
      const accountLimit = await storage.checkAccountLimit(workspaceId, req.user!.userId);
      if (!accountLimit.canCreate) {
        return res.status(403).json({
          message: `Anda telah mencapai batas maksimal account untuk paket basic (${accountLimit.current}/${accountLimit.limit}). Upgrade ke paket premium untuk account lebih banyak.`,
          limits: accountLimit
        });
      }

      const accountData = insertAccountSchema.parse({
        ...req.body,
        workspaceId,
        balance: req.body.balance ? req.body.balance.toString() : "0",
      });

      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error) {
      console.error("Account creation error:", error);
      res.status(400).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = { ...req.body };
      
      // Validate required fields and convert types
      if (updates.balance !== undefined) {
        updates.balance = parseFloat(updates.balance).toString();
      }
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      
      // Ensure workspace validation
      if (!updates.workspaceId && req.body.workspaceId) {
        updates.workspaceId = parseInt(req.body.workspaceId);
      }

      console.log("Updating account:", id, "with data:", updates);
      const account = await storage.updateAccount(id, updates);
      res.json(account);
    } catch (error) {
      console.error("Account update error:", error);
      res.status(400).json({ 
        message: "Failed to update account", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.delete("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAccount(id);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete account" });
    }
  });

  // Transaction routes
  app.get("/api/workspaces/:workspaceId/transactions", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getWorkspaceTransactions(workspaceId, limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/workspaces/:workspaceId/transactions", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        workspaceId,
        amount: req.body.amount.toString(), // Convert amount to string
        date: new Date(req.body.date), // Ensure date is properly formatted
      });

      const transaction = await storage.createTransaction(transactionData);
      
      // Only process debt repayment if it's a repayment transaction
      if (transaction.type === 'repayment' && transaction.debtId) {
        await storage.updateDebtRepayment(transaction.debtId, parseFloat(transaction.amount));
        console.log(`Debt payment processed: ${transaction.amount} for debt ID: ${transaction.debtId}`);
      }
      
      // Check for other smart notifications triggers (excluding repayment processing)
      await checkNonRepaymentNotifications(workspaceId, transaction);
      
      res.json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.put("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.date) {
        updates.date = new Date(updates.date);
      }
      if (updates.amount) {
        updates.amount = updates.amount.toString();
      }

      const transaction = await storage.updateTransaction(id, updates);
      res.json(transaction);
    } catch (error) {
      console.error("Transaction update error:", error);
      res.status(400).json({ message: "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransaction(id);
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Transaction delete error:", error);
      res.status(400).json({ message: "Failed to delete transaction" });
    }
  });

  // Dashboard routes
  app.get("/api/workspaces/:workspaceId/dashboard", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const dashboardData = await storage.getDashboardData(workspaceId);
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard data" });
    }
  });

  // Budget routes
  app.get("/api/workspaces/:workspaceId/budgets", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const budgets = await storage.getWorkspaceBudgets(workspaceId, year, month);
      res.json(budgets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get budgets" });
    }
  });

  app.post("/api/workspaces/:workspaceId/budgets", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const year = parseInt(req.body.year) || new Date().getFullYear();
      const month = req.body.month ? parseInt(req.body.month) : undefined;

      // Check budget limits untuk basic package users
      const budgetLimit = await storage.checkBudgetLimit(workspaceId, req.user.userId, year, month);
      if (!budgetLimit.canCreate) {
        return res.status(403).json({
          message: `Anda telah mencapai batas maksimal budget plan untuk paket basic (${budgetLimit.current}/${budgetLimit.limit} per periode). Upgrade ke paket premium untuk budget unlimited.`,
          limits: budgetLimit
        });
      }

      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        workspaceId,
        amount: req.body.amount.toString(), // Convert amount to string
        year,
        month,
      });

      const budget = await storage.createBudget(budgetData);
      res.json(budget);
    } catch (error) {
      console.error("Budget creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create budget" });
      }
    }
  });

  app.put("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.year) {
        updates.year = parseInt(updates.year);
      }
      if (updates.month) {
        updates.month = parseInt(updates.month);
      }
      if (updates.amount) {
        updates.amount = updates.amount.toString();
      }

      const budget = await storage.updateBudget(id, updates);
      res.json(budget);
    } catch (error) {
      console.error("Budget update error:", error);
      res.status(400).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBudget(id);
      res.json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Budget delete error:", error);
      res.status(400).json({ message: "Failed to delete budget" });
    }
  });

  // Debt routes
  app.get("/api/workspaces/:workspaceId/debts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const debts = await storage.getWorkspaceDebts(workspaceId);
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get debts" });
    }
  });

  app.post("/api/workspaces/:workspaceId/debts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const debtData = insertDebtSchema.parse({
        ...req.body,
        workspaceId,
        totalAmount: req.body.totalAmount.toString(),
        remainingAmount: req.body.remainingAmount.toString(),
        interestRate: req.body.interestRate ? req.body.interestRate.toString() : null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        monthlyPaymentAmount: req.body.monthlyPaymentAmount ? req.body.monthlyPaymentAmount.toString() : null,
        nextPaymentDate: req.body.nextPaymentDate ? new Date(req.body.nextPaymentDate) : null,
        minimumPaymentAmount: req.body.minimumPaymentAmount ? req.body.minimumPaymentAmount.toString() : null,
      });

      const debt = await storage.createDebt(debtData);
      res.json(debt);
    } catch (error) {
      console.error("Debt creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create debt" });
      }
    }
  });

  app.put("/api/debts/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }
      if (updates.nextPaymentDate) {
        updates.nextPaymentDate = new Date(updates.nextPaymentDate);
      }
      if (updates.totalAmount) {
        updates.totalAmount = updates.totalAmount.toString();
      }
      if (updates.remainingAmount) {
        updates.remainingAmount = updates.remainingAmount.toString();
      }
      if (updates.interestRate) {
        updates.interestRate = updates.interestRate.toString();
      }
      if (updates.monthlyPaymentAmount) {
        updates.monthlyPaymentAmount = updates.monthlyPaymentAmount.toString();
      }
      if (updates.minimumPaymentAmount) {
        updates.minimumPaymentAmount = updates.minimumPaymentAmount.toString();
      }

      const debt = await storage.updateDebt(id, updates);
      res.json(debt);
    } catch (error) {
      console.error("Debt update error:", error);
      res.status(400).json({ message: "Failed to update debt" });
    }
  });

  app.delete("/api/debts/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDebt(id);
      res.json({ message: "Debt deleted successfully" });
    } catch (error) {
      console.error("Debt delete error:", error);
      res.status(400).json({ message: "Failed to delete debt" });
    }
  });

  // Get debt repayment history
  app.get("/api/debts/:id/repayments", authenticateToken, async (req, res) => {
    try {
      const debtId = parseInt(req.params.id);
      const repayments = await storage.getDebtRepayments(debtId);
      res.json(repayments);
    } catch (error) {
      console.error("Get debt repayments error:", error);
      res.status(500).json({ message: "Failed to get debt repayments" });
    }
  });

  // RBAC - Roles Management
  app.get("/api/roles", authenticateToken, requirePermission('roles.read'), async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/api/roles", authenticateToken, requirePermission('roles.create'), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Role creation error:", error);
      res.status(400).json({ message: "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.updateRole(id, req.body);
      res.json(role);
    } catch (error) {
      res.status(400).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete role" });
    }
  });

  // RBAC - Permissions Management
  app.get("/api/permissions", authenticateToken, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.get("/api/roles/:roleId/permissions", authenticateToken, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissions = await storage.getRolePermissions(roleId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get role permissions" });
    }
  });

  app.post("/api/roles/:roleId/permissions", authenticateToken, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { permissionId } = req.body;
      const rolePermission = await storage.addRolePermission({ roleId, permissionId });
      res.json(rolePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add role permission" });
    }
  });

  app.delete("/api/roles/:roleId/permissions/:permissionId", authenticateToken, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);
      await storage.removeRolePermission(roleId, permissionId);
      res.json({ message: "Role permission removed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to remove role permission" });
    }
  });

  // Subscription Packages Management
  app.get("/api/subscription-packages", authenticateToken, requirePermission('subscriptions.read'), async (req, res) => {
    try {
      const packages = await storage.getAllSubscriptionPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription packages" });
    }
  });

  app.post("/api/subscription-packages", authenticateToken, async (req, res) => {
    try {
      const packageData = insertSubscriptionPackageSchema.parse({
        ...req.body,
        price: req.body.price.toString(),
      });
      const pkg = await storage.createSubscriptionPackage(packageData);
      res.json(pkg);
    } catch (error) {
      console.error("Package creation error:", error);
      res.status(400).json({ message: "Failed to create subscription package" });
    }
  });

  app.put("/api/subscription-packages/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.price) {
        updates.price = updates.price.toString();
      }
      const pkg = await storage.updateSubscriptionPackage(id, updates);
      res.json(pkg);
    } catch (error) {
      res.status(400).json({ message: "Failed to update subscription package" });
    }
  });

  app.delete("/api/subscription-packages/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubscriptionPackage(id);
      res.json({ message: "Subscription package deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete subscription package" });
    }
  });

  // Notification routes
  app.get('/api/workspaces/:workspaceId/notifications', authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const notifications = await storage.getNotificationsByWorkspace(workspaceId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/workspaces/:workspaceId/notifications', authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const notificationData = req.body;
      const notification = await storage.createNotification({
        ...notificationData,
        workspaceId
      });
      res.json(notification);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Recurring transaction automation endpoint
  app.post('/api/workspaces/:workspaceId/execute-recurring', authenticateToken, async (req: any, res) => {
    try {
      await storage.executeRecurringTransactions();
      res.json({ success: true, message: 'Recurring transactions processed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute recurring transactions' });
    }
  });

  // User Management
  app.get("/api/users", authenticateToken, requirePermission('users.read'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.getUserWithRole(id);
      if (result) {
        const { password, ...safeUser } = result;
        res.json({ user: safeUser, role: result.role });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requirePermission('users.update'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const user = await storage.updateUser(id, updates);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // User Subscriptions
  app.get("/api/user/subscription", authenticateToken, async (req: any, res) => {
    try {
      const result = await storage.getUserSubscriptionWithPackage(req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user subscription" });
    }
  });

  // Admin endpoints for managing user subscriptions
  app.get("/api/admin/user-subscriptions", authenticateToken, requirePermission('subscriptions.read'), async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const subscriptionsData = await Promise.all(
        users.map(async (user) => {
          try {
            const userSub = await storage.getUserSubscriptionWithPackage(user.id);
            if (userSub) {
              return {
                ...userSub.subscription,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  roleId: user.roleId,
                  createdAt: user.createdAt
                },
                package: userSub.package
              };
            }
          } catch (error) {
            return null;
          }
        })
      );
      
      const validSubscriptions = subscriptionsData.filter(Boolean);
      res.json(validSubscriptions);
    } catch (error) {
      console.error("Failed to get admin user subscriptions:", error);
      res.status(500).json({ message: "Failed to get user subscriptions" });
    }
  });

  app.put("/api/admin/user-subscriptions/:subscriptionId", authenticateToken, requirePermission('subscriptions.update'), async (req: any, res) => {
    try {
      const subscriptionId = parseInt(req.params.subscriptionId);
      const updates = req.body;
      
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }

      const subscription = await storage.updateUserSubscription(subscriptionId, updates);
      res.json(subscription);
    } catch (error) {
      console.error("Failed to update user subscription:", error);
      res.status(400).json({ message: "Failed to update user subscription" });
    }
  });

  app.get("/api/users/:userId/subscription", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await storage.getUserSubscriptionWithPackage(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user subscription" });
    }
  });

  // Workspace Subscriptions
  app.get("/api/workspaces/:workspaceId/subscription", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const result = await storage.getWorkspaceSubscriptionWithPackage(workspaceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get workspace subscription" });
    }
  });

  app.post("/api/workspaces/:workspaceId/subscription", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      // Check if user can create shared workspace
      const userSub = await storage.getUserSubscriptionWithPackage(req.user.userId);
      if (!userSub || !userSub.package.canCreateSharedWorkspace) {
        return res.status(403).json({ 
          message: "Anda perlu upgrade ke paket Professional atau Business untuk membuat shared workspace." 
        });
      }

      const subscriptionData = {
        ...req.body,
        workspaceId,
        ownerId: req.user.userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };
      
      const subscription = await storage.createWorkspaceSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      console.error("Workspace subscription creation error:", error);
      res.status(400).json({ message: "Failed to create workspace subscription" });
    }
  });

  app.get("/api/users/:userId/workspace-subscriptions", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscriptions = await storage.getUserOwnedWorkspaceSubscriptions(userId);
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user workspace subscriptions" });
    }
  });

  app.post("/api/user/subscription", authenticateToken, async (req: any, res) => {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserSubscription(req.user.userId);
      
      if (existingSubscription) {
        // Update existing subscription
        const subscriptionData = {
          packageId: req.body.packageId,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          status: req.body.status || "active"
        };
        
        const subscription = await storage.updateUserSubscription(existingSubscription.id, subscriptionData);
        res.json(subscription);
      } else {
        // Create new subscription
        const subscriptionData = insertUserSubscriptionSchema.parse({
          ...req.body,
          userId: req.user.userId,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
        });
        const subscription = await storage.createUserSubscription(subscriptionData);
        res.json(subscription);
      }
    } catch (error) {
      console.error("Subscription creation/update error:", error);
      res.status(400).json({ message: "Failed to process user subscription" });
    }
  });

  app.post("/api/users/:userId/subscription", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscriptionData = insertUserSubscriptionSchema.parse({
        ...req.body,
        userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      const subscription = await storage.createUserSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      console.error("Subscription creation error:", error);
      res.status(400).json({ message: "Failed to create user subscription" });
    }
  });

  // Check account limits
  app.get('/api/workspaces/:workspaceId/account-limits', authenticateToken, async (req, res) => {
    const workspaceId = parseInt(req.params.workspaceId);

    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      const limits = await storage.checkAccountLimit(workspaceId, req.user.userId);
      res.json(limits);
    } catch (error) {
      res.status(500).json({ message: 'Failed to check account limits' });
    }
  });


  // Check category limits
  app.get('/api/workspaces/:workspaceId/category-limits', authenticateToken, async (req, res) => {
    const workspaceId = parseInt(req.params.workspaceId);

    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      const limits = await storage.checkCategoryLimit(workspaceId, req.user.userId);
      res.json(limits);
    } catch (error) {
      res.status(500).json({ message: 'Failed to check category limits' });
    }
  });

  // Check budget limits
  app.get('/api/workspaces/:workspaceId/budget-limits', authenticateToken, async (req, res) => {
    const workspaceId = parseInt(req.params.workspaceId);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      const limits = await storage.checkBudgetLimit(workspaceId, req.user.userId, year, month);
      res.json(limits);
    } catch (error) {
      res.status(500).json({ message: 'Failed to check budget limits' });
    }
  });

  // Public routes for landing page
  app.get("/api/public/subscription-packages", async (req, res) => {
    try {
      const packages = await storage.getActiveSubscriptionPackages();
      res.json(packages);
    } catch (error) {
      console.error("Failed to get public subscription packages:", error);
      res.status(500).json({ message: "Failed to get subscription packages" });
    }
  });

  // Settings routes
  app.get("/api/settings", authenticateToken, requirePermission("settings.read"), async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Failed to get settings:", error);
      res.status(500).json({ message: "Failed to get application settings" });
    }
  });

  app.put("/api/settings", authenticateToken, requirePermission("settings.update"), async (req, res) => {
    try {
      const updates = req.body;
      const settings = await storage.updateAppSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Failed to update settings:", error);
      res.status(400).json({ message: "Failed to update application settings" });
    }
  });

  // Analytics routes
  app.get("/api/workspaces/:workspaceId/analytics", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const timeframe = (req.query.timeframe as string) || '6months';
      
      const analyticsData = await storage.getAnalyticsData(workspaceId, timeframe);
      res.json(analyticsData);
    } catch (error) {
      console.error("Failed to get analytics data:", error);
      res.status(500).json({ message: "Failed to get analytics data" });
    }
  });

  app.get("/api/workspaces/:workspaceId/financial-health", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      const healthData = await storage.getFinancialHealthData(workspaceId);
      res.json(healthData);
    } catch (error) {
      console.error("Failed to get financial health data:", error);
      res.status(500).json({ message: "Failed to get financial health data" });
    }
  });

  // Notification routes
  app.get("/api/workspaces/:workspaceId/notifications/debt-reminders", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      const reminders = await storage.checkDebtReminders(workspaceId);
      res.json(reminders);
    } catch (error) {
      console.error("Failed to get debt reminders:", error);
      res.status(500).json({ message: "Failed to get debt reminders" });
    }
  });

  app.get("/api/workspaces/:workspaceId/notifications/budget-alerts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      const alerts = await storage.checkBudgetAlerts(workspaceId);
      res.json(alerts);
    } catch (error) {
      console.error("Failed to get budget alerts:", error);
      res.status(500).json({ message: "Failed to get budget alerts" });
    }
  });

  // Payment routes (dummy implementation)
  app.post("/api/payment/process", authenticateToken, async (req, res) => {
    try {
      const { packageId, cardNumber, cardHolder } = req.body;
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would:
      // 1. Validate payment details with payment gateway
      // 2. Process the payment
      // 3. Update user subscription
      
      // For demo, just update the user's subscription
      const now = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);
      
      await storage.createUserSubscription({
        userId: req.user!.userId,
        packageId: packageId,
        startDate: now,
        endDate: oneMonthLater,
        status: "active"
      });
      
      res.json({ 
        success: true, 
        message: "Payment processed successfully",
        transactionId: `demo_${Date.now()}`
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(400).json({ message: "Payment processing failed" });
    }
  });

  // Enhanced Goals API endpoints
  app.get("/api/workspaces/:workspaceId/goals", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const goals = await storage.getGoalsByWorkspace(workspaceId);
      res.json(goals);
    } catch (error) {
      console.error("Failed to get goals:", error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  // Goal Performance Metrics - MUST BE BEFORE /:id routes
  app.get("/api/workspaces/:workspaceId/goals/metrics", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const metrics = await storage.getGoalPerformanceMetrics(workspaceId);
      res.json(metrics);
    } catch (error) {
      console.error("Failed to get goal metrics:", error);
      res.status(500).json({ message: "Failed to get goal metrics" });
    }
  });

  // AI-Powered Goal Suggestions - MUST BE BEFORE /:id routes
  app.get("/api/workspaces/:workspaceId/goals/suggestions", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      // Gather financial data for AI analysis
      const [transactions, accounts, budgets, goals, debts] = await Promise.all([
        storage.getWorkspaceTransactions(workspaceId, 100), // Recent 100 transactions
        storage.getWorkspaceAccounts(workspaceId),
        storage.getWorkspaceBudgets(workspaceId, new Date().getFullYear()),
        storage.getGoalsByWorkspace(workspaceId),
        storage.getWorkspaceDebts(workspaceId)
      ]);

      // Calculate financial metrics
      const recentTransactions = transactions.slice(-30); // Last 30 transactions
      const monthlyIncome = recentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const financialData = {
        transactions: recentTransactions,
        accounts,
        budgets,
        goals,
        debts,
        monthlyIncome,
        monthlyExpenses
      };

      const suggestions = await aiGoalsService.generateGoalSuggestions(financialData);
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to get AI goal suggestions:", error);
      res.status(500).json({ message: "Failed to get goal suggestions" });
    }
  });

  // AI-Powered Goal Insights API - MUST BE BEFORE /:id routes
  app.get("/api/workspaces/:workspaceId/goals/insights", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      // Gather financial data for AI analysis
      const [transactions, goals, budgets] = await Promise.all([
        storage.getWorkspaceTransactions(workspaceId, 50), // Recent 50 transactions
        storage.getGoalsByWorkspace(workspaceId),
        storage.getWorkspaceBudgets(workspaceId, new Date().getFullYear())
      ]);

      // Calculate financial metrics
      const recentTransactions = transactions.slice(-30);
      const monthlyIncome = recentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monthlyExpenses = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const financialData = {
        transactions: recentTransactions,
        goals,
        budgets,
        monthlyIncome,
        monthlyExpenses
      };

      const insights = await aiGoalsService.generateGoalInsights(financialData);
      res.json(insights);
    } catch (error) {
      console.error("Failed to get AI goal insights:", error);
      res.status(500).json({ message: "Failed to get goal insights" });
    }
  });

  // Get goal with detailed information
  app.get("/api/workspaces/:workspaceId/goals/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      const goalDetails = await storage.getGoalWithDetails(id);
      if (!goalDetails) {
        return res.status(404).json({ message: "Goal not found" });
      }
      res.json(goalDetails);
    } catch (error) {
      console.error("Failed to get goal details:", error);
      res.status(500).json({ message: "Failed to get goal details" });
    }
  });

  // Get goal analytics and AI insights
  app.get("/api/workspaces/:workspaceId/goals/:id/analytics", authenticateToken, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const analytics = await goalsService.analyzeGoal(goalId);
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get goal analytics:", error);
      res.status(500).json({ message: "Failed to get goal analytics" });
    }
  });

  app.post("/api/workspaces/:workspaceId/goals", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const goalData = insertGoalSchema.parse({
        ...req.body,
        workspaceId,
        targetDate: req.body.targetDate,
      });
      const goal = await storage.createGoal(goalData);
      
      // Auto-create milestones if requested
      if (req.body.createMilestones) {
        await goalsService.createIntelligentMilestones(goal.id);
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Failed to create goal:", error);
      res.status(400).json({ message: "Failed to create goal" });
    }
  });

  app.patch("/api/workspaces/:workspaceId/goals/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const workspaceId = parseInt(req.params.workspaceId);
      const updates = req.body;
      const goal = await storage.updateGoal(id, updates);
      res.json(goal);
    } catch (error) {
      console.error("Failed to update goal:", error);
      res.status(400).json({ message: "Failed to update goal" });
    }
  });

  app.delete("/api/workspaces/:workspaceId/goals/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGoal(id);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Failed to delete goal:", error);
      res.status(400).json({ message: "Failed to delete goal" });
    }
  });

  // These have been moved above to prevent route conflicts

  // Goal Milestones API
  app.get("/api/workspaces/:workspaceId/goals/:id/milestones", authenticateToken, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const milestones = await storage.getGoalMilestones(goalId);
      res.json(milestones);
    } catch (error) {
      console.error("Failed to get goal milestones:", error);
      res.status(500).json({ message: "Failed to get goal milestones" });
    }
  });

  app.post("/api/workspaces/:workspaceId/goals/:id/milestones", authenticateToken, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const milestoneData = insertGoalMilestoneSchema.parse({
        ...req.body,
        goalId,
      });
      const milestone = await storage.createGoalMilestone(milestoneData);
      res.json(milestone);
    } catch (error) {
      console.error("Failed to create milestone:", error);
      res.status(400).json({ message: "Failed to create milestone" });
    }
  });

  // Auto-create intelligent milestones
  app.post("/api/workspaces/:workspaceId/goals/:id/milestones/generate", authenticateToken, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      await goalsService.createIntelligentMilestones(goalId);
      const milestones = await storage.getGoalMilestones(goalId);
      res.json(milestones);
    } catch (error) {
      console.error("Failed to generate milestones:", error);
      res.status(400).json({ message: "Failed to generate milestones" });
    }
  });

  // This has been moved above to prevent route conflicts

  app.patch("/api/workspaces/:workspaceId/goals/insights/:id/read", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const insight = await storage.markGoalInsightAsRead(id);
      res.json(insight);
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
      res.status(400).json({ message: "Failed to mark insight as read" });
    }
  });

  // Recurring Transactions API endpoints
  app.get("/api/workspaces/:workspaceId/recurring-transactions", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const transactions = await storage.getRecurringTransactionsByWorkspace(workspaceId);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to get recurring transactions:", error);
      res.status(500).json({ message: "Failed to get recurring transactions" });
    }
  });

  app.post("/api/workspaces/:workspaceId/recurring-transactions", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      
      // Calculate next execution date based on frequency and start date
      const startDate = new Date(req.body.startDate);
      let nextExecution = new Date(startDate);
      
      const transactionData = insertRecurringTransactionSchema.parse({
        ...req.body,
        workspaceId,
        startDate: req.body.startDate, // Keep as string
        endDate: req.body.endDate || undefined, // Keep as string or undefined
      });
      
      // Add nextExecution separately since it's not in the schema
      const createData = {
        ...transactionData,
        nextExecution,
      };
      
      const transaction = await storage.createRecurringTransaction(createData);
      res.json(transaction);
    } catch (error) {
      console.error("Failed to create recurring transaction:", error);
      res.status(400).json({ message: "Failed to create recurring transaction" });
    }
  });

  app.patch("/api/workspaces/:workspaceId/recurring-transactions/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      // Keep dates as strings - Drizzle will handle conversion
      const transaction = await storage.updateRecurringTransaction(id, updates);
      res.json(transaction);
    } catch (error) {
      console.error("Failed to update recurring transaction:", error);
      res.status(400).json({ message: "Failed to update recurring transaction" });
    }
  });

  app.delete("/api/workspaces/:workspaceId/recurring-transactions/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRecurringTransaction(id);
      res.json({ message: "Recurring transaction deleted successfully" });
    } catch (error) {
      console.error("Failed to delete recurring transaction:", error);
      res.status(400).json({ message: "Failed to delete recurring transaction" });
    }
  });

  // Category Rules API endpoints
  app.get("/api/workspaces/:workspaceId/category-rules", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const rules = await storage.getCategoryRulesByWorkspace(workspaceId);
      res.json(rules);
    } catch (error) {
      console.error("Failed to get category rules:", error);
      res.status(500).json({ message: "Failed to get category rules" });
    }
  });

  app.post("/api/workspaces/:workspaceId/category-rules", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const ruleData = insertCategoryRuleSchema.parse({
        ...req.body,
        workspaceId,
      });
      const rule = await storage.createCategoryRule(ruleData);
      res.json(rule);
    } catch (error) {
      console.error("Failed to create category rule:", error);
      res.status(400).json({ message: "Failed to create category rule" });
    }
  });

  app.patch("/api/workspaces/:workspaceId/category-rules/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const rule = await storage.updateCategoryRule(id, updates);
      res.json(rule);
    } catch (error) {
      console.error("Failed to update category rule:", error);
      res.status(400).json({ message: "Failed to update category rule" });
    }
  });

  app.delete("/api/workspaces/:workspaceId/category-rules/:id", authenticateToken, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategoryRule(id);
      res.json({ message: "Category rule deleted successfully" });
    } catch (error) {
      console.error("Failed to delete category rule:", error);
      res.status(400).json({ message: "Failed to delete category rule" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}