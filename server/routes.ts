import type { Express } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, insertWorkspaceSchema, insertCategorySchema, 
  insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertDebtSchema,
  insertRoleSchema, insertPermissionSchema, insertRolePermissionSchema,
  insertSubscriptionPackageSchema, insertUserSubscriptionSchema
} from "@shared/schema";

const storage = new DatabaseStorage();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
async function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

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

      // Create personal workspace
      const workspace = await storage.createWorkspace({
        name: "Personal",
        type: "personal",
        ownerId: user.id,
      });

      // Create default categories
      const defaultCategories = [
        { name: "Gaji", type: "income", icon: "briefcase", description: "Monthly salary", workspaceId: workspace.id },
        { name: "Groceries", type: "needs", icon: "shopping-cart", description: "Food and groceries", workspaceId: workspace.id },
        { name: "Electricity", type: "needs", icon: "bolt", description: "Electricity bills", workspaceId: workspace.id },
        { name: "Transportation", type: "needs", icon: "bus", description: "Transportation costs", workspaceId: workspace.id },
        { name: "Subscriptions", type: "wants", icon: "tv", description: "Entertainment subscriptions", workspaceId: workspace.id },
      ];

      for (const category of defaultCategories) {
        await storage.createCategory(category);
      }

      // Create default accounts
      const defaultAccounts = [
        { 
          name: "BCA Debit", 
          type: "transaction", 
          currency: "IDR", 
          balance: "12500000",
          notes: "Primary transaction account",
          workspaceId: workspace.id 
        },
        { 
          name: "BSI Debit", 
          type: "transaction", 
          currency: "IDR", 
          balance: "3250000",
          notes: "Secondary transaction account",
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
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
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
      // Check if user can create more workspaces
      const canCreate = await storage.canCreateWorkspace(req.user.userId);
      if (!canCreate) {
        const limits = await storage.getUserSubscriptionLimits(req.user.userId);
        return res.status(403).json({ 
          message: "Anda telah mencapai batas maksimal workspace. Upgrade ke paket premium untuk membuat workspace lebih banyak.",
          limits 
        });
      }

      const workspaceData = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: req.user.userId,
      });
      
      const workspace = await storage.createWorkspace(workspaceData);
      res.json(workspace);
    } catch (error) {
      console.error("Workspace creation error:", error);
      res.status(400).json({ message: "Failed to create workspace" });
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

  app.post("/api/workspaces/:workspaceId/categories", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const categoryData = insertCategorySchema.parse({
        ...req.body,
        workspaceId,
      });
      
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
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
      const updates = req.body;
      if (updates.balance) {
        updates.balance = updates.balance.toString();
      }
      
      const account = await storage.updateAccount(id, updates);
      res.json(account);
    } catch (error) {
      console.error("Account update error:", error);
      res.status(400).json({ message: "Failed to update account" });
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

  app.post("/api/workspaces/:workspaceId/budgets", authenticateToken, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        workspaceId,
        amount: req.body.amount.toString(), // Convert amount to string
        year: parseInt(req.body.year) || new Date().getFullYear(),
        month: req.body.month ? parseInt(req.body.month) : null,
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
      if (updates.totalAmount) {
        updates.totalAmount = updates.totalAmount.toString();
      }
      if (updates.remainingAmount) {
        updates.remainingAmount = updates.remainingAmount.toString();
      }
      if (updates.interestRate) {
        updates.interestRate = updates.interestRate.toString();
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

  // RBAC - Roles Management
  app.get("/api/roles", authenticateToken, async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/api/roles", authenticateToken, async (req, res) => {
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
  app.get("/api/subscription-packages", authenticateToken, async (req, res) => {
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

  // User Management
  app.get("/api/users", authenticateToken, async (req, res) => {
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
        const { password, ...safeUser } = result.user;
        res.json({ user: safeUser, role: result.role });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, async (req, res) => {
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
  app.get("/api/users/:userId/subscription", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const result = await storage.getUserSubscriptionWithPackage(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user subscription" });
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

  const httpServer = createServer(app);
  return httpServer;
}
