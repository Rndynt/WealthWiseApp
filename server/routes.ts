import type { Express } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
  insertUserSchema, insertWorkspaceSchema, insertCategorySchema, 
  insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertDebtSchema 
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
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
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
      const workspaceData = insertWorkspaceSchema.parse({
        ...req.body,
        ownerId: req.user.userId,
      });
      
      const workspace = await storage.createWorkspace(workspaceData);
      res.json(workspace);
    } catch (error) {
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
      });
      
      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error) {
      res.status(400).json({ message: "Failed to create account" });
    }
  });

  app.put("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const account = await storage.updateAccount(id, updates);
      res.json(account);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
