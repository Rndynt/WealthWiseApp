import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { DatabaseStorage, type SubscriptionPackageLimitConfig, type SubscriptionLimitResource, type SubscriptionLimitScope } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  insertUserSchema, insertWorkspaceSchema, insertCategorySchema,
  insertAccountSchema, insertTransactionSchema, insertBudgetSchema, insertDebtSchema,
  insertRoleSchema, insertPermissionSchema, insertRolePermissionSchema,
  insertSubscriptionPackageSchema, insertUserSubscriptionSchema,
  insertGoalSchema, insertGoalMilestoneSchema, insertRecurringTransactionSchema, insertCategoryRuleSchema,
  categoryTypeSchema
} from "@shared/schema";
import type { Account, InsertTransaction, InsertCategory, InsertBudget } from "@shared/schema";
import { db } from "./db";
import { workspaceMembers as workspaceMembersTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

type UserWithRole = Exclude<Awaited<ReturnType<DatabaseStorage["getUserWithRole"]>>, undefined>;

type RequestAccessContext = {
  user: UserWithRole;
  permissions: Set<string>;
};

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
      accessContext?: RequestAccessContext;
    }
  }
}

const storage = new DatabaseStorage();
import { goalsService } from './goals-service';
import { aiGoalsService } from './ai-goals-service';
import { GoalsEnhancedService } from './goals-enhanced-service';
import { WorkspaceSubscriptionService } from './workspace-subscription-service';

const goalsEnhancedService = new GoalsEnhancedService();
const workspaceSubscriptionService = new WorkspaceSubscriptionService(storage);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const DEFAULT_USER_ROLE_NAME = "user_basic";

const roleIdCache = new Map<string, number>();

const LIMIT_RESOURCES: SubscriptionLimitResource[] = ['accounts', 'categories', 'budgets'];
const LIMIT_SCOPES: SubscriptionLimitScope[] = ['per_workspace', 'global_user'];

function parseLimitValue(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }

  return Math.floor(numeric);
}

function parseLimitConfigurations(input: unknown): SubscriptionPackageLimitConfig[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const configs: SubscriptionPackageLimitConfig[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const resource = (raw as any).resource;
    if (!LIMIT_RESOURCES.includes(resource)) {
      continue;
    }

    const rawScope = (raw as any).scope;
    const scope: SubscriptionLimitScope = LIMIT_SCOPES.includes(rawScope) ? rawScope : 'per_workspace';

    const parsedLimit = parseLimitValue((raw as any).limit);
    if (parsedLimit === undefined) {
      continue;
    }

    configs.push({
      resource,
      scope,
      limit: parsedLimit ?? null,
    });
  }

  return configs;
}

async function resolveRoleId(roleName: string): Promise<number> {
  if (roleIdCache.has(roleName)) {
    return roleIdCache.get(roleName)!;
  }

  const role = await storage.getRoleByName(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  roleIdCache.set(roleName, role.id);
  return role.id;
}

const workspaceIdParamsSchema = z.object({
  workspaceId: z.string().uuid({ message: 'Invalid workspace id' }),
});

function validateWorkspaceIdParam(req: Request, res: any): string | undefined {
  const result = workspaceIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid workspace id' });
    return;
  }
  return result.data.workspaceId;
}

const categoryIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid category id' }),
});

function validateCategoryIdParam(req: Request, res: any): string | undefined {
  const result = categoryIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid category id' });
    return;
  }
  return result.data.id;
}

const accountIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid account id' }),
});

function validateAccountIdParam(req: Request, res: any): string | undefined {
  const result = accountIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid account id' });
    return;
  }
  return result.data.id;
}

const transactionIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid transaction id' }),
});

function validateTransactionIdParam(req: Request, res: any): string | undefined {
  const result = transactionIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid transaction id' });
    return;
  }
  return result.data.id;
}

const budgetIdParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid budget id' }),
});

function validateBudgetIdParam(req: Request, res: any): string | undefined {
  const result = budgetIdParamsSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ message: 'Invalid budget id' });
    return;
  }
  return result.data.id;
}

async function loadRequestAccessContext(req: Request): Promise<RequestAccessContext | null> {
  if (req.accessContext) {
    return req.accessContext;
  }

  if (!req.user?.userId) {
    return null;
  }

  const userRecord = await storage.getUserWithRole(req.user.userId);
  if (!userRecord) {
    return null;
  }

  const permissionList = await storage.getUserPermissions(req.user.userId);
  const context: RequestAccessContext = {
    user: userRecord,
    permissions: new Set(permissionList),
  };

  req.accessContext = context;
  return context;
}

async function syncUserSharedWorkspaces(userId: string): Promise<void> {
  const workspaces = await storage.getUserWorkspaces(userId);
  await Promise.all(
    workspaces
      .filter((workspace) => workspace.membershipType === 'owned' && workspace.type === 'shared')
      .map((workspace) => storage.syncWorkspaceSubscriptionFromUser(workspace.id))
  );
}

const updateAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(['transaction', 'asset'], {
    errorMap: () => ({ message: 'Account type must be transaction or asset' }),
  }),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
}).strict().partial().refine((data) => Object.keys(data).length > 0, {
  message: 'No account updates provided',
});

const transactionTypeSchema = z.enum(['income', 'expense', 'transfer', 'saving', 'debt', 'repayment']);

const updateTransactionSchema = z.object({
  type: transactionTypeSchema.optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  description: z.string().min(1, 'Description is required').optional(),
  date: z.coerce.date().optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.union([z.string().uuid(), z.null()]).optional(),
  toAccountId: z.union([z.string().uuid(), z.null()]).optional(),
  debtId: z.union([z.number().int().positive(), z.null()]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No transaction updates provided',
});

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').optional(),
  type: categoryTypeSchema.optional(),
  icon: z.string().min(1, 'Category icon is required').optional(),
  description: z.union([z.string(), z.null()]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No category updates provided',
});

const updateBudgetSchema = z.object({
  amount: z.union([z.number(), z.string()]).optional(),
  period: z.enum(['monthly', 'yearly']).optional(),
  month: z.union([z.coerce.number().int().min(1).max(12), z.null()]).optional(),
  year: z.coerce.number().int().optional(),
  categoryId: z.string().uuid().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'No budget updates provided',
});

// Smart notification triggers (excluding repayment processing to avoid double deduction)
async function checkNonRepaymentNotifications(workspaceId: string, transaction: any) {
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



async function calculateCategorySpending(workspaceId: string, categoryId: string): Promise<number> {
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
  return async (req: Request, res: any, next: any) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ message: "User tidak terautentikasi" });
      }

      const context = await loadRequestAccessContext(req);
      if (!context) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      const { user: currentUser, permissions } = context;
      if (currentUser.role?.name === 'root' || permissions.has('root.bypass')) {
        return next();
      }

      if (!permissions.has(permission)) {
        return res.status(403).json({ message: "Akses ditolak. Permission tidak memadai." });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
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
      const userBasicRoleId = await resolveRoleId(DEFAULT_USER_ROLE_NAME);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        roleId: userBasicRoleId,
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
      
      if (type === 'shared') {
        const synced = await storage.syncWorkspaceSubscriptionFromUser(workspace.id);

        if (!synced) {
          console.error('Failed to synchronize workspace subscription from user subscription', workspace.id);
          return res.status(500).json({
            message: 'Gagal menyinkronkan langganan workspace dari langganan akun. Silakan hubungi administrator.',
          });
        }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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

  app.post('/api/workspaces/:workspaceId/invite', authenticateToken, requirePermission('user.collaboration.manage'), async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const { email, role } = req.body as { email: string; role: 'editor' | 'viewer' };
      if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required' });
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace tidak ditemukan.' });
      }

      if (workspace.type === 'personal') {
        return res.status(403).json({ message: 'Kolaborasi tidak tersedia untuk workspace personal.' });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const name = email.split('@')[0];
        const hashedPassword = await bcrypt.hash('demo123', 10);
        const userBasicRoleId = await resolveRoleId(DEFAULT_USER_ROLE_NAME);
        user = await storage.createUser({
          email,
          password: hashedPassword,
          name,
          roleId: userBasicRoleId,
        });
      }

      const existingMembers = await storage.getWorkspaceMembers(workspaceId);
      const alreadyMember = existingMembers.some((member) => member.userId === user!.id);
      if (alreadyMember) {
        return res.status(400).json({ message: 'Pengguna tersebut sudah tergabung dalam workspace ini.' });
      }

      const limitValidation = await workspaceSubscriptionService.validateMemberLimit(
        workspaceId,
        existingMembers.length,
      );

      if (!limitValidation.canAdd) {
        return res.status(403).json({
          message: limitValidation.reason || 'Batas anggota workspace telah tercapai.',
        });
      }

      const member = await storage.addWorkspaceMember({ workspaceId, userId: user!.id, role });
      res.json({ ...member, user: { id: user!.id, name: user!.name, email: user!.email } });
    } catch (error) {
      console.error('Failed to invite member:', error);
      const message = error instanceof Error ? error.message : 'Failed to invite member';
      res.status(400).json({ message });
    }
  });

  app.put('/api/workspaces/:workspaceId/members/:memberId', authenticateToken, requirePermission('user.collaboration.manage'), async (req: any, res) => {
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

  app.delete('/api/workspaces/:workspaceId/members/:memberId', authenticateToken, requirePermission('user.collaboration.manage'), async (req: any, res) => {
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have access to this workspace' });
      }

      const categories = await storage.getWorkspaceCategories(workspaceId);
      res.json(categories);
    } catch (error) {
      console.error('Failed to get categories:', error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/workspaces/:workspaceId/categories", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to create categories in this workspace' });
      }

      // Check category limits untuk basic package users
      const categoryLimit = await storage.checkCategoryLimit(workspaceId, req.user.userId);
      if (!categoryLimit.canCreate) {
        const scopeLabel = categoryLimit.scope === 'global_user' ? 'kuota global kategori' : 'kuota kategori di workspace ini';
        return res.status(403).json({
          message: `Anda telah mencapai batas kategori (${categoryLimit.current}/${categoryLimit.limit ?? '∞'}) untuk ${scopeLabel}. Upgrade paket untuk kapasitas lebih besar.`,
          limits: categoryLimit
        });
      }

      const categoryData = insertCategorySchema.parse({
        ...req.body,
        description: req.body?.description ?? undefined,
        workspaceId,
      });

      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid category data' });
      }
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const id = validateCategoryIdParam(req, res);
      if (!id) {
        return;
      }

      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const workspace = await storage.getWorkspace(existingCategory.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this category' });
      }

      const membership = await storage.getWorkspaceMembership(existingCategory.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to update this category' });
      }

      const parsedUpdates = updateCategorySchema.parse({
        ...req.body,
        description: req.body?.description ?? undefined,
      });

      const updates: Partial<InsertCategory> = {};
      if (parsedUpdates.name !== undefined) {
        updates.name = parsedUpdates.name;
      }
      if (parsedUpdates.type !== undefined) {
        updates.type = parsedUpdates.type;
      }
      if (parsedUpdates.icon !== undefined) {
        updates.icon = parsedUpdates.icon;
      }
      if (parsedUpdates.description !== undefined) {
        updates.description = parsedUpdates.description ?? null;
      }

      const category = await storage.updateCategory(id, updates);
      res.json(category);
    } catch (error) {
      console.error("Category update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid category update' });
      }
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
    try {
      const id = validateCategoryIdParam(req, res);
      if (!id) {
        return;
      }

      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const workspace = await storage.getWorkspace(existingCategory.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this category' });
      }

      const membership = await storage.getWorkspaceMembership(existingCategory.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to delete this category' });
      }

      const hasTransactions = await storage.categoryHasTransactions(id);
      if (hasTransactions) {
        return res.status(409).json({ message: 'Cannot delete category while transactions still reference it' });
      }

      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error('Category delete error:', error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Account routes
  app.get("/api/workspaces/:workspaceId/accounts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const accounts = await storage.getWorkspaceAccounts(workspaceId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get accounts" });
    }
  });

  app.post("/api/workspaces/:workspaceId/accounts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      // Check category limits untuk basic package users
      const accountLimit = await storage.checkAccountLimit(workspaceId, req.user!.userId);
      if (!accountLimit.canCreate) {
        const scopeLabel = accountLimit.scope === 'global_user' ? 'kuota global akun' : 'kuota akun di workspace ini';
        return res.status(403).json({
          message: `Anda telah mencapai batas akun (${accountLimit.current}/${accountLimit.limit ?? '∞'}) untuk ${scopeLabel}. Upgrade paket untuk kapasitas lebih besar.`,
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
      const accountId = validateAccountIdParam(req, res);
      if (!accountId) {
        return;
      }

      if (req.body && typeof req.body === 'object') {
        if ('balance' in req.body) {
          return res.status(400).json({
            message: 'Account balance is calculated automatically and cannot be edited manually.',
          });
        }
        if ('workspaceId' in req.body) {
          return res.status(400).json({
            message: 'Workspace cannot be reassigned for an existing account.',
          });
        }
      }

      const existingAccount = await storage.getAccount(accountId);
      if (!existingAccount) {
        return res.status(404).json({ message: "Account not found" });
      }

      const workspace = await storage.getWorkspace(existingAccount.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found for this account" });
      }

      const membership = await storage.getWorkspaceMembership(existingAccount.workspaceId, req.user!.userId);
      const isWorkspaceOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isWorkspaceOwner) {
        return res.status(403).json({ message: "You do not have permission to update this account" });
      }

      const updates = updateAccountSchema.parse(req.body);
      const account = await storage.updateAccount(accountId, updates);
      res.json(account);
    } catch (error) {
      console.error("Account update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid account data' });
      }
      const message = error instanceof Error ? error.message : 'Failed to update account';
      const statusCode = message === 'No valid account fields provided for update' ? 400 : 500;
      res.status(statusCode).json({ message });
    }
  });

  app.delete("/api/accounts/:id", authenticateToken, async (req, res) => {
    try {
      const accountId = validateAccountIdParam(req, res);
      if (!accountId) {
        return;
      }

      const account = await storage.getAccount(accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const workspace = await storage.getWorkspace(account.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found for this account" });
      }

      const membership = await storage.getWorkspaceMembership(account.workspaceId, req.user!.userId);
      const isWorkspaceOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isWorkspaceOwner) {
        return res.status(403).json({ message: "You do not have permission to delete this account" });
      }

      if (await storage.accountHasTransactions(accountId)) {
        return res.status(409).json({
          message: 'Account cannot be deleted while transactions or transfers still reference it. Please move or delete those entries first.',
        });
      }

      await storage.deleteAccount(accountId);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Account delete error:', error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Transaction routes
  app.get("/api/workspaces/:workspaceId/transactions", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have access to this workspace' });
      }

      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined;
      const transactions = await storage.getWorkspaceTransactions(workspaceId, limit);
      res.json(transactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.post("/api/workspaces/:workspaceId/transactions", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to create transactions in this workspace' });
      }

      if (!req.body || typeof req.body.amount === 'undefined') {
        return res.status(400).json({ message: 'Amount is required' });
      }

      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        workspaceId,
        amount: req.body.amount.toString(),
        date: new Date(req.body.date),
      });

      if (parseFloat(transactionData.amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than zero' });
      }

      const sourceAccount = await storage.getAccount(transactionData.accountId);
      if (!sourceAccount || sourceAccount.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Account not found in this workspace' });
      }

      let destinationAccount = null;
      if (transactionData.toAccountId) {
        destinationAccount = await storage.getAccount(transactionData.toAccountId);
        if (!destinationAccount || destinationAccount.workspaceId !== workspaceId) {
          return res.status(400).json({ message: 'Destination account not found in this workspace' });
        }
      }

      if (transactionData.type === 'transfer') {
        if (!transactionData.toAccountId) {
          return res.status(400).json({ message: 'Transfer transactions require a destination account' });
        }

        if (transactionData.toAccountId === transactionData.accountId) {
          return res.status(400).json({ message: 'Destination account must be different from the source account' });
        }

        if (destinationAccount && destinationAccount.currency !== sourceAccount.currency) {
          return res.status(400).json({ message: 'Transfers can only occur between accounts with the same currency' });
        }
      }

      if (transactionData.type === 'saving' && transactionData.toAccountId) {
        if (transactionData.toAccountId === transactionData.accountId) {
          return res.status(400).json({ message: 'Destination account must be different from the source account' });
        }

        if (destinationAccount && destinationAccount.currency !== sourceAccount.currency) {
          return res.status(400).json({ message: 'Savings can only occur between accounts with the same currency' });
        }
      }

      if (transactionData.type === 'repayment') {
        if (!transactionData.debtId) {
          return res.status(400).json({ message: 'Repayment transactions require an associated debt' });
        }

        const debt = await storage.getDebtById(transactionData.debtId);
        if (!debt || debt.workspaceId !== workspaceId) {
          return res.status(400).json({ message: 'Debt not found in this workspace' });
        }
      }

      if (transactionData.categoryId) {
        const category = await storage.getCategory(transactionData.categoryId);
        if (!category || category.workspaceId !== workspaceId) {
          return res.status(400).json({ message: 'Category not found in this workspace' });
        }
      }

      if (transactionData.type !== 'income' && transactionData.type !== 'expense') {
        transactionData.categoryId = undefined;
      }

      if (transactionData.type !== 'transfer' && transactionData.type !== 'saving') {
        transactionData.toAccountId = undefined;
      }

      if (transactionData.type !== 'repayment') {
        transactionData.debtId = undefined;
      }

      const transaction = await storage.createTransaction(transactionData);

      if (transaction.type === 'repayment' && transaction.debtId) {
        await storage.updateDebtRepayment(transaction.debtId, parseFloat(transaction.amount));
        console.log(`Debt payment processed: ${transaction.amount} for debt ID: ${transaction.debtId}`);
      }

      try {
        await goalsEnhancedService.processTransactionForGoals(transaction.id, workspaceId);
        console.log(`Goals auto-tracking processed for transaction ID: ${transaction.id}`);
      } catch (error) {
        console.error('Goals auto-tracking failed:', error);
      }

      await checkNonRepaymentNotifications(workspaceId, transaction);

      res.json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid transaction data' });
      }
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.put("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const id = validateTransactionIdParam(req, res);
      if (!id) {
        return;
      }

      const existingTransaction = await storage.getTransaction(id);
      if (!existingTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const workspace = await storage.getWorkspace(existingTransaction.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this transaction' });
      }

      const membership = await storage.getWorkspaceMembership(existingTransaction.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to update this transaction' });
      }

      const parsedUpdates = updateTransactionSchema.parse(req.body ?? {});

      const updates: Partial<InsertTransaction> = {};

      if (parsedUpdates.type) {
        updates.type = parsedUpdates.type;
      }

      if (parsedUpdates.description !== undefined) {
        updates.description = parsedUpdates.description;
      }

      if (parsedUpdates.date) {
        updates.date = parsedUpdates.date;
      }

      if (parsedUpdates.accountId !== undefined) {
        updates.accountId = parsedUpdates.accountId;
      }

      if (parsedUpdates.amount !== undefined) {
        const numericAmount = typeof parsedUpdates.amount === 'number'
          ? parsedUpdates.amount
          : Number.parseFloat(parsedUpdates.amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: 'Amount must be greater than zero' });
        }

        updates.amount = numericAmount.toString();
      }

      const hasCategoryUpdate = Object.prototype.hasOwnProperty.call(parsedUpdates, 'categoryId');
      if (hasCategoryUpdate) {
        updates.categoryId = parsedUpdates.categoryId ?? null;
      }

      const hasToAccountUpdate = Object.prototype.hasOwnProperty.call(parsedUpdates, 'toAccountId');
      if (hasToAccountUpdate) {
        updates.toAccountId = parsedUpdates.toAccountId ?? null;
      }

      const hasDebtUpdate = Object.prototype.hasOwnProperty.call(parsedUpdates, 'debtId');
      if (hasDebtUpdate) {
        updates.debtId = parsedUpdates.debtId ?? null;
      }

      const nextType = updates.type ?? existingTransaction.type;
      const nextAccountId = updates.accountId ?? existingTransaction.accountId;
      const nextToAccountId = hasToAccountUpdate ? (parsedUpdates.toAccountId ?? null) : existingTransaction.toAccountId;
      const nextDebtId = hasDebtUpdate ? (parsedUpdates.debtId ?? null) : existingTransaction.debtId;
      const nextCategoryId = hasCategoryUpdate ? (parsedUpdates.categoryId ?? null) : existingTransaction.categoryId;

      const account = await storage.getAccount(nextAccountId);
      if (!account || account.workspaceId !== existingTransaction.workspaceId) {
        return res.status(400).json({ message: 'Account not found in this workspace' });
      }

      let destinationAccount: Account | null = null;
      if (nextToAccountId) {
        const candidate = await storage.getAccount(nextToAccountId);
        destinationAccount = candidate ?? null;
        if (!destinationAccount || destinationAccount.workspaceId !== existingTransaction.workspaceId) {
          return res.status(400).json({ message: 'Destination account not found in this workspace' });
        }
      }

      if (nextType === 'transfer') {
        if (!nextToAccountId) {
          return res.status(400).json({ message: 'Transfer transactions require a destination account' });
        }

        if (nextToAccountId === nextAccountId) {
          return res.status(400).json({ message: 'Destination account must be different from the source account' });
        }

        if (destinationAccount && destinationAccount.currency !== account.currency) {
          return res.status(400).json({ message: 'Transfers can only occur between accounts with the same currency' });
        }
      } else if (nextType === 'saving') {
        if (nextToAccountId && nextToAccountId === nextAccountId) {
          return res.status(400).json({ message: 'Destination account must be different from the source account' });
        }

        if (destinationAccount && destinationAccount.currency !== account.currency) {
          return res.status(400).json({ message: 'Savings can only occur between accounts with the same currency' });
        }
      } else if (hasToAccountUpdate || existingTransaction.toAccountId) {
        updates.toAccountId = null;
      }

      if (nextType === 'repayment') {
        if (!nextDebtId) {
          return res.status(400).json({ message: 'Repayment transactions require an associated debt' });
        }

        const debt = await storage.getDebtById(nextDebtId);
        if (!debt || debt.workspaceId !== existingTransaction.workspaceId) {
          return res.status(400).json({ message: 'Debt not found in this workspace' });
        }
      } else if (hasDebtUpdate || existingTransaction.debtId) {
        updates.debtId = null;
      }

      if (nextType !== 'income' && nextType !== 'expense') {
        if (hasCategoryUpdate || existingTransaction.categoryId) {
          updates.categoryId = null;
        }
      } else if (nextCategoryId) {
        const category = await storage.getCategory(nextCategoryId);
        if (!category || category.workspaceId !== existingTransaction.workspaceId) {
          return res.status(400).json({ message: 'Category not found in this workspace' });
        }
      }

      const updatedTransaction = await storage.updateTransaction(id, updates);
      if (!updatedTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (existingTransaction.type === 'repayment' && existingTransaction.debtId) {
        await storage.updateDebtRepayment(existingTransaction.debtId, -parseFloat(existingTransaction.amount));
      }

      if (updatedTransaction.type === 'repayment' && updatedTransaction.debtId) {
        await storage.updateDebtRepayment(updatedTransaction.debtId, parseFloat(updatedTransaction.amount));
      }

      res.json(updatedTransaction);
    } catch (error) {
      console.error("Transaction update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid transaction update' });
      }
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update transaction" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
    try {
      const id = validateTransactionIdParam(req, res);
      if (!id) {
        return;
      }

      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const workspace = await storage.getWorkspace(transaction.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this transaction' });
      }

      const membership = await storage.getWorkspaceMembership(transaction.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to delete this transaction' });
      }

      if (transaction.type === 'repayment' && transaction.debtId) {
        await storage.updateDebtRepayment(transaction.debtId, -parseFloat(transaction.amount));
      }

      await storage.deleteTransaction(id);
      res.json({ message: "Transaction deleted successfully", success: true });
    } catch (error) {
      console.error("Transaction delete error:", error);
      res.status(500).json({
        message: "Failed to delete transaction",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Dashboard routes
  app.get("/api/workspaces/:workspaceId/dashboard", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const dashboardData = await storage.getDashboardData(workspaceId);
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard data" });
    }
  });

  // Budget routes
  app.get("/api/workspaces/:workspaceId/budgets", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have access to this workspace' });
      }

      const year = Number.parseInt(req.query.year as string, 10) || new Date().getFullYear();
      const month = req.query.month ? Number.parseInt(req.query.month as string, 10) : undefined;

      const budgets = await storage.getWorkspaceBudgets(workspaceId, year, month);
      res.json(budgets);
    } catch (error) {
      console.error('Failed to get budgets:', error);
      res.status(500).json({ message: "Failed to get budgets" });
    }
  });

  app.post("/api/workspaces/:workspaceId/budgets", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to create budgets in this workspace' });
      }

      const year = Number.parseInt(req.body.year, 10) || new Date().getFullYear();
      const month = req.body.month ? Number.parseInt(req.body.month, 10) : undefined;

      // Check budget limits untuk basic package users
      const budgetLimit = await storage.checkBudgetLimit(workspaceId, req.user.userId, year, month);
      if (!budgetLimit.canCreate) {
        const scopeLabel = budgetLimit.scope === 'global_user' ? 'kuota global budget plan' : 'kuota budget di workspace ini';
        return res.status(403).json({
          message: `Anda telah mencapai batas budget (${budgetLimit.current}/${budgetLimit.limit ?? '∞'}) untuk ${scopeLabel}. Upgrade paket untuk kapasitas lebih besar.`,
          limits: budgetLimit
        });
      }

      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        workspaceId,
        amount: req.body.amount.toString(),
        year,
        month: month ?? null,
      });

      if (budgetData.period === 'monthly' && !budgetData.month) {
        return res.status(400).json({ message: 'Monthly budgets require a month value' });
      }

      if (budgetData.period === 'yearly') {
        budgetData.month = null;
      }

      const category = await storage.getCategory(budgetData.categoryId);
      if (!category || category.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Category not found in this workspace' });
      }

      const budget = await storage.createBudget(budgetData);
      res.json(budget);
    } catch (error) {
      console.error("Budget creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid budget data' });
      }
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create budget" });
      }
    }
  });

  app.put("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const budgetId = validateBudgetIdParam(req, res);
      if (!budgetId) {
        return;
      }

      const existingBudget = await storage.getBudget(budgetId);
      if (!existingBudget) {
        return res.status(404).json({ message: 'Budget not found' });
      }

      const workspace = await storage.getWorkspace(existingBudget.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this budget' });
      }

      const membership = await storage.getWorkspaceMembership(existingBudget.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to update this budget' });
      }

      const parsedUpdates = updateBudgetSchema.parse({
        ...req.body,
        month: req.body?.month ?? undefined,
      });

      const updates: Partial<InsertBudget> = {};

      if (parsedUpdates.amount !== undefined) {
        const numericAmount = typeof parsedUpdates.amount === 'number'
          ? parsedUpdates.amount
          : Number.parseFloat(parsedUpdates.amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: 'Amount must be greater than zero' });
        }

        updates.amount = numericAmount.toString();
      }

      if (parsedUpdates.period !== undefined) {
        updates.period = parsedUpdates.period;
      }

      const hasMonthUpdate = Object.prototype.hasOwnProperty.call(parsedUpdates, 'month');
      if (hasMonthUpdate) {
        updates.month = parsedUpdates.month ?? null;
      }

      if (parsedUpdates.year !== undefined) {
        updates.year = parsedUpdates.year;
      }

      if (parsedUpdates.categoryId !== undefined) {
        updates.categoryId = parsedUpdates.categoryId;
      }

      const nextPeriod = updates.period ?? existingBudget.period;
      const nextMonth = hasMonthUpdate ? (parsedUpdates.month ?? null) : existingBudget.month;

      if (nextPeriod === 'monthly' && !nextMonth) {
        return res.status(400).json({ message: 'Monthly budgets require a month value' });
      }

      if (nextPeriod === 'yearly') {
        updates.month = null;
      } else if (hasMonthUpdate && parsedUpdates.month) {
        updates.month = parsedUpdates.month;
      }

      const nextCategoryId = updates.categoryId ?? existingBudget.categoryId;
      const category = await storage.getCategory(nextCategoryId);
      if (!category || category.workspaceId !== existingBudget.workspaceId) {
        return res.status(400).json({ message: 'Category not found in this workspace' });
      }

      const budget = await storage.updateBudget(budgetId, updates);
      res.json(budget);
    } catch (error) {
      console.error("Budget update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? 'Invalid budget update' });
      }
      res.status(400).json({ message: "Failed to update budget" });
    }
  });

  app.delete("/api/budgets/:id", authenticateToken, async (req, res) => {
    try {
      const budgetId = validateBudgetIdParam(req, res);
      if (!budgetId) {
        return;
      }

      const existingBudget = await storage.getBudget(budgetId);
      if (!existingBudget) {
        return res.status(404).json({ message: 'Budget not found' });
      }

      const workspace = await storage.getWorkspace(existingBudget.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found for this budget' });
      }

      const membership = await storage.getWorkspaceMembership(existingBudget.workspaceId, req.user!.userId);
      const isOwner = workspace.ownerId === req.user!.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have permission to delete this budget' });
      }

      await storage.deleteBudget(budgetId);
      res.json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Budget delete error:", error);
      res.status(400).json({ message: "Failed to delete budget" });
    }
  });

  // Debt routes
  app.get("/api/workspaces/:workspaceId/debts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const debts = await storage.getWorkspaceDebts(workspaceId);
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get debts" });
    }
  });

  app.post("/api/workspaces/:workspaceId/debts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
  app.get("/api/roles", authenticateToken, requirePermission('admin.roles.read'), async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.post("/api/roles", authenticateToken, requirePermission('admin.roles.create'), async (req, res) => {
    try {
      const roleData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Role creation error:", error);
      res.status(400).json({ message: "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", authenticateToken, requirePermission('admin.roles.update'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const role = await storage.updateRole(id, req.body);
      res.json(role);
    } catch (error) {
      res.status(400).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", authenticateToken, requirePermission('admin.roles.delete'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete role" });
    }
  });

  // RBAC - Permissions Management
  app.get("/api/permissions", authenticateToken, requirePermission('admin.permissions.read'), async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.get("/api/roles/:roleId/permissions", authenticateToken, requirePermission('admin.permissions.read'), async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissions = await storage.getRolePermissions(roleId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get role permissions" });
    }
  });

  app.post("/api/roles/:roleId/permissions", authenticateToken, requirePermission('admin.roles.update'), async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { permissionId } = req.body;
      const rolePermission = await storage.addRolePermission({ roleId, permissionId });
      res.json(rolePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add role permission" });
    }
  });

  app.delete("/api/roles/:roleId/permissions/:permissionId", authenticateToken, requirePermission('admin.roles.update'), async (req, res) => {
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
  app.get("/api/subscription-packages", authenticateToken, requirePermission('admin.subscriptions.access'), async (req, res) => {
    try {
      const packages = await storage.getAllSubscriptionPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subscription packages" });
    }
  });

  app.post("/api/subscription-packages", authenticateToken, requirePermission('admin.subscriptions.manage'), async (req, res) => {
    try {
      const packageData = insertSubscriptionPackageSchema.parse({
        ...req.body,
        slug: typeof req.body.slug === "string" ? req.body.slug.trim() : "",
        price: req.body.price.toString(),
      });

      const normalizedData = {
        ...packageData,
        slug: packageData.slug.toLowerCase(),
      };

      if (!normalizedData.slug) {
        return res.status(400).json({ message: "Slug paket wajib diisi." });
      }

      const limitConfigs = parseLimitConfigurations(req.body?.limits);
      const pkg = await storage.createSubscriptionPackage(normalizedData, limitConfigs);
      res.json(pkg);
    } catch (error) {
      console.error("Package creation error:", error);
      res.status(400).json({ message: "Failed to create subscription package" });
    }
  });

  app.put("/api/subscription-packages/:id", authenticateToken, requirePermission('admin.subscriptions.manage'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.price) {
        updates.price = updates.price.toString();
      }
      if (typeof updates.slug === "string") {
        updates.slug = updates.slug.trim().toLowerCase();
        if (!updates.slug) {
          return res.status(400).json({ message: "Slug paket tidak boleh kosong." });
        }
      }
      const limitConfigs = Object.prototype.hasOwnProperty.call(req.body, 'limits')
        ? parseLimitConfigurations(req.body.limits)
        : undefined;
      const pkg = await storage.updateSubscriptionPackage(id, updates, limitConfigs);
      res.json(pkg);
    } catch (error) {
      res.status(400).json({ message: "Failed to update subscription package" });
    }
  });

  app.delete("/api/subscription-packages/:id", authenticateToken, requirePermission('admin.subscriptions.manage'), async (req, res) => {
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const notifications = await storage.getNotificationsByWorkspace(workspaceId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post('/api/workspaces/:workspaceId/notifications', authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
  app.get("/api/users", authenticateToken, requirePermission('admin.users.read'), async (req, res) => {
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
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      if (req.user?.userId !== id) {
        const context = await loadRequestAccessContext(req);
        if (!context) {
          return res.status(403).json({ message: "Akses ditolak. Permission tidak memadai." });
        }

        const { user: currentUser, permissions } = context;
        if (currentUser.role?.name !== 'root' && !permissions.has('root.bypass') && !permissions.has('admin.users.read')) {
          return res.status(403).json({ message: "Akses ditolak. Permission tidak memadai." });
        }
      }

      const result = await storage.getUserWithRole(id);
      if (result) {
        const { password, ...safeUser } = result;
        res.json({ user: safeUser, role: result.role });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error('Failed to get user:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requirePermission('admin.users.update'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Invalid user id" });
      }
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

  app.delete("/api/users/:id", authenticateToken, requirePermission('admin.users.delete'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Invalid user id" });
      }
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
  app.get("/api/admin/user-subscriptions", authenticateToken, requirePermission('admin.subscriptions.access'), async (req: any, res) => {
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

  app.put("/api/admin/user-subscriptions/:subscriptionId", authenticateToken, requirePermission('admin.subscriptions.manage'), async (req: any, res) => {
    try {
      const subscriptionId = parseInt(req.params.subscriptionId, 10);
      const updates = req.body;
      
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }

      const subscription = await storage.updateUserSubscription(subscriptionId, updates);
      await syncUserSharedWorkspaces(subscription.userId);
      res.json(subscription);
    } catch (error) {
      console.error("Failed to update user subscription:", error);
      res.status(400).json({ message: "Failed to update user subscription" });
    }
  });

  app.get("/api/users/:userId/subscription", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const result = await storage.getUserSubscriptionWithPackage(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user subscription" });
    }
  });

  // Workspace Subscriptions
  app.get("/api/workspaces/:workspaceId/subscription", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const result = await storage.getWorkspaceSubscriptionWithPackage(workspaceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get workspace subscription" });
    }
  });

  app.post("/api/workspaces/:workspaceId/subscription", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace tidak ditemukan.' });
      }

      if (workspace.ownerId !== req.user.userId) {
        return res.status(403).json({ message: 'Hanya pemilik workspace yang dapat menyegarkan langganan.' });
      }

      if (workspace.type !== 'shared') {
        return res.status(400).json({ message: 'Workspace pribadi tidak memerlukan langganan kolaborasi terpisah.' });
      }

      const userSub = await storage.getUserSubscriptionWithPackage(req.user.userId);
      if (!userSub) {
        return res.status(403).json({ message: 'Langganan akun aktif tidak ditemukan. Silakan berlangganan terlebih dahulu.' });
      }

      if (!userSub.package.canCreateSharedWorkspace) {
        return res.status(403).json({
          message: 'Anda perlu upgrade ke paket Professional atau Business untuk menggunakan shared workspace.',
        });
      }

      const synced = await storage.syncWorkspaceSubscriptionFromUser(workspaceId);
      if (!synced) {
        return res.status(409).json({ message: 'Gagal menyinkronkan langganan workspace dari langganan akun.' });
      }

      res.json(synced);
    } catch (error) {
      console.error("Workspace subscription creation error:", error);
      res.status(400).json({ message: "Failed to create workspace subscription" });
    }
  });

  app.get("/api/users/:userId/workspace-subscriptions", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const subscriptions = await storage.getUserOwnedWorkspaceSubscriptions(userId);
      const synced = await Promise.all(subscriptions.map(async (entry) => {
        const updated = await storage.syncWorkspaceSubscriptionFromUser(entry.workspace.id);
        if (updated) {
          return { ...updated, workspace: entry.workspace };
        }
        return entry;
      }));
      res.json(synced);
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
        await syncUserSharedWorkspaces(req.user.userId);
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
        await syncUserSharedWorkspaces(req.user.userId);
        res.json(subscription);
      }
    } catch (error) {
      console.error("Subscription creation/update error:", error);
      res.status(400).json({ message: "Failed to process user subscription" });
    }
  });

  app.post("/api/users/:userId/subscription", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const subscriptionData = insertUserSubscriptionSchema.parse({
        ...req.body,
        userId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      const subscription = await storage.createUserSubscription(subscriptionData);
      await syncUserSharedWorkspaces(subscription.userId);
      res.json(subscription);
    } catch (error) {
      console.error("Subscription creation error:", error);
      res.status(400).json({ message: "Failed to create user subscription" });
    }
  });

  // Check account limits
  app.get('/api/workspaces/:workspaceId/account-limits', authenticateToken, async (req, res) => {
    const workspaceId = validateWorkspaceIdParam(req, res);
    if (!workspaceId) {
      return;
    }

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
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user.userId);
      const isOwner = workspace.ownerId === req.user.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have access to this workspace' });
      }

      const limits = await storage.checkCategoryLimit(workspaceId, req.user.userId);
      res.json(limits);
    } catch (error) {
      console.error('Failed to check category limits:', error);
      res.status(500).json({ message: 'Failed to check category limits' });
    }
  });

  // Check budget limits
  app.get('/api/workspaces/:workspaceId/budget-limits', authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }

      const year = Number.parseInt(req.query.year as string, 10) || new Date().getFullYear();
      const month = req.query.month ? Number.parseInt(req.query.month as string, 10) : undefined;

      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = await storage.getWorkspaceMembership(workspaceId, req.user.userId);
      const isOwner = workspace.ownerId === req.user.userId;
      if (!membership && !isOwner) {
        return res.status(403).json({ message: 'You do not have access to this workspace' });
      }

      const limits = await storage.checkBudgetLimit(workspaceId, req.user.userId, year, month);
      res.json(limits);
    } catch (error) {
      console.error('Failed to check budget limits:', error);
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
  app.get("/api/settings", authenticateToken, requirePermission('admin.settings.access'), async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Failed to get settings:", error);
      res.status(500).json({ message: "Failed to get application settings" });
    }
  });

  app.put("/api/settings", authenticateToken, requirePermission('admin.settings.update'), async (req, res) => {
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
      const reminders = await storage.checkDebtReminders(workspaceId);
      res.json(reminders);
    } catch (error) {
      console.error("Failed to get debt reminders:", error);
      res.status(500).json({ message: "Failed to get debt reminders" });
    }
  });

  app.get("/api/workspaces/:workspaceId/notifications/budget-alerts", authenticateToken, async (req, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const transactions = await storage.getRecurringTransactionsByWorkspace(workspaceId);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to get recurring transactions:", error);
      res.status(500).json({ message: "Failed to get recurring transactions" });
    }
  });

  app.post("/api/workspaces/:workspaceId/recurring-transactions", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      
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
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
      const rules = await storage.getCategoryRulesByWorkspace(workspaceId);
      res.json(rules);
    } catch (error) {
      console.error("Failed to get category rules:", error);
      res.status(500).json({ message: "Failed to get category rules" });
    }
  });

  app.post("/api/workspaces/:workspaceId/category-rules", authenticateToken, async (req: any, res) => {
    try {
      const workspaceId = validateWorkspaceIdParam(req, res);
      if (!workspaceId) {
        return;
      }
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
