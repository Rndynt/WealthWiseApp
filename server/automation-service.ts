// Automation Service for Recurring Transactions and Smart Features
import { db } from './db';
import { 
  recurringTransactions, 
  transactions, 
  goals, 
  notifications,
  InsertTransaction,
  RecurringTransaction,
  Goal,
  InsertNotification
} from '../shared/schema';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { addDays, addWeeks, addMonths, addYears, isBefore, format } from 'date-fns';

export class AutomationService {
  
  // Execute recurring transactions that are due
  async executeRecurringTransactions(): Promise<void> {
    console.log('Running recurring transaction automation...');
    
    const now = new Date();
    
    // Get all active recurring transactions that are due
    const dueTransactions = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.isActive, true),
          or(
            lte(recurringTransactions.nextExecution, now.toISOString()),
            isNull(recurringTransactions.nextExecution)
          )
        )
      );

    for (const recurring of dueTransactions) {
      try {
        // Create the actual transaction
        const transactionData: InsertTransaction = {
          workspaceId: recurring.workspaceId,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          type: recurring.type as 'income' | 'expense' | 'transfer',
          amount: recurring.amount,
          description: `${recurring.name} - Automated`,
          date: now.toISOString(),
        };

        const [newTransaction] = await db
          .insert(transactions)
          .values(transactionData)
          .returning();

        // Calculate next execution date
        let nextExecution: Date;
        const currentDate = new Date(recurring.nextExecution || now);
        
        switch (recurring.frequency) {
          case 'daily':
            nextExecution = addDays(currentDate, 1);
            break;
          case 'weekly':
            nextExecution = addWeeks(currentDate, 1);
            break;
          case 'monthly':
            nextExecution = addMonths(currentDate, 1);
            break;
          case 'yearly':
            nextExecution = addYears(currentDate, 1);
            break;
          default:
            nextExecution = addMonths(currentDate, 1);
        }

        // Update recurring transaction
        await db
          .update(recurringTransactions)
          .set({
            lastExecuted: now.toISOString(),
            nextExecution: nextExecution.toISOString(),
          })
          .where(eq(recurringTransactions.id, recurring.id));

        // Create success notification
        await this.createNotification({
          workspaceId: recurring.workspaceId,
          type: 'success',
          title: 'Recurring Transaction Executed',
          message: `${recurring.name} - ${recurring.amount} IDR processed automatically`,
          category: 'transaction',
          data: { transactionId: newTransaction.id, recurringId: recurring.id }
        });

        console.log(`Executed recurring transaction: ${recurring.name}`);
        
      } catch (error) {
        console.error(`Failed to execute recurring transaction ${recurring.id}:`, error);
        
        // Create error notification
        await this.createNotification({
          workspaceId: recurring.workspaceId,
          type: 'error',
          title: 'Recurring Transaction Failed',
          message: `Failed to process ${recurring.name}. Please check your account balance.`,
          category: 'transaction',
          data: { recurringId: recurring.id }
        });
      }
    }
  }

  // Auto-update goal progress from transactions
  async updateGoalProgress(transactionId: number): Promise<void> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) return;

    // Find matching goals (savings goals with matching account)
    const workspaceGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.workspaceId, transaction.workspaceId));

    for (const goal of workspaceGoals) {
      // Update goal progress if this is a savings transaction to goal account
      if (goal.type === 'savings' && 
          (transaction.type === 'income' || transaction.type === 'transfer') &&
          transaction.accountId === goal.targetAccountId) {
        
        const progressAmount = parseFloat(transaction.amount);
        const currentProgress = parseFloat(goal.currentAmount);
        const newProgress = currentProgress + progressAmount;
        const targetAmount = parseFloat(goal.targetAmount);

        await db
          .update(goals)
          .set({
            currentAmount: newProgress.toString(),
            updatedAt: new Date(),
          })
          .where(eq(goals.id, goal.id));

        // Check if goal is achieved
        if (newProgress >= targetAmount && goal.status !== 'completed') {
          await db
            .update(goals)
            .set({
              status: 'completed',
              completedAt: new Date(),
            })
            .where(eq(goals.id, goal.id));

          // Create achievement notification
          await this.createNotification({
            workspaceId: goal.workspaceId,
            type: 'success',
            title: 'Goal Achieved! 🎉',
            message: `Congratulations! You've reached your goal: ${goal.name}`,
            category: 'goal',
            data: { goalId: goal.id }
          });
        }
      }
    }
  }

  // Create persistent notifications
  async createNotification(notification: Omit<InsertNotification, 'createdAt'>): Promise<void> {
    try {
      await db.insert(notifications).values({
        ...notification,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  // Get unread notifications for workspace
  async getUnreadNotifications(workspaceId: number, limit = 20) {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(notifications.createdAt)
      .limit(limit);
  }

  // Mark notifications as read
  async markNotificationsAsRead(notificationIds: number[]): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date() 
      })
      .where(eq(notifications.id, notificationIds[0])); // Simple implementation for now
  }

  // Start automation scheduler (called from main server)
  startScheduler(): void {
    // Run every minute for testing, should be every hour in production
    setInterval(() => {
      this.executeRecurringTransactions();
    }, 60 * 1000); // 1 minute

    console.log('Automation scheduler started');
  }
}

export const automationService = new AutomationService();