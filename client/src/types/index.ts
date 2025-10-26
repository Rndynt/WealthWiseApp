export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'shared';
  ownerId: string;
  createdAt: string;
  membershipRole?: string;
  membershipType?: 'owned' | 'member';
}

export interface WorkspaceSubscriptionLimits {
  personalOwned: number;
  personalMember: number;
  personalLimit: number | null;
  sharedOwned: number;
  sharedMember: number;
  sharedLimit: number | null;
  maxMembers: number | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'needs' | 'wants';
  icon: string;
  description?: string;
  workspaceId: string;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'transaction' | 'asset';
  currency: string;
  balance: string;
  notes?: string;
  workspaceId: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense' | 'transfer' | 'saving' | 'debt' | 'repayment';
  amount: string;
  description: string;
  date: string;
  accountId: string;
  categoryId?: string;
  toAccountId?: string | null;
  debtId?: number;
  workspaceId: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: string;
  period: 'monthly' | 'yearly';
  month?: number;
  year: number;
  workspaceId: string;
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
  workspaceId: string;
  createdAt: string;
}

export interface DashboardData {
  totalBalance: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  netWorth: string;
  recentTransactions: Transaction[];
}
