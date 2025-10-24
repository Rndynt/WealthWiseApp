export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Workspace {
  id: number;
  name: string;
  type: 'personal' | 'shared';
  ownerId: number;
  createdAt: string;
  membershipRole?: string;
  membershipType?: 'owned' | 'member';
}

export interface WorkspaceSubscriptionLimits {
  personalOwned: number;
  personalLimit: number | null;
  sharedOwned: number;
  sharedLimit: number | null;
  maxMembers: number | null;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'needs' | 'wants';
  icon: string;
  description?: string;
  workspaceId: number;
  createdAt: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'transaction' | 'asset';
  currency: string;
  balance: string;
  notes?: string;
  workspaceId: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense' | 'transfer' | 'saving' | 'debt' | 'repayment';
  amount: string;
  description: string;
  date: string;
  accountId: number;
  categoryId?: number;
  toAccountId?: number;
  debtId?: number;
  workspaceId: number;
  createdAt: string;
}

export interface Budget {
  id: number;
  categoryId: number;
  amount: string;
  period: 'monthly' | 'yearly';
  month?: number;
  year: number;
  workspaceId: number;
  createdAt: string;
}

export interface Debt {
  id: number;
  name: string;
  type: 'debt' | 'credit';
  totalAmount: string;
  remainingAmount: string;
  interestRate?: string;
  dueDate?: string;
  // Enhanced payment tracking
  monthlyPaymentAmount?: string;
  monthlyPaymentDate?: number;
  nextPaymentDate?: string;
  minimumPaymentAmount?: string;
  paymentReminder: boolean;
  status: 'active' | 'paid' | 'overdue';
  workspaceId: number;
  createdAt: string;
}

export interface DashboardData {
  totalBalance: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  netWorth: string;
  recentTransactions: Transaction[];
}
