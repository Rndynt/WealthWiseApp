import { db } from './db';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import {
  goals,
  goalContributions,
  goalMilestones,
  goalInsights,
  transactions,
  accounts,
  debts,
  budgets,
  categories
} from '../shared/schema';
import { differenceInDays, addMonths, format, isAfter, isBefore } from 'date-fns';

export interface GoalRecommendation {
  type: 'amount' | 'timeline' | 'priority' | 'strategy';
  title: string;
  message: string;
  confidence: number;
  actionable: boolean;
  data?: any;
}

export interface GoalAnalytics {
  velocity: number; // Amount per month
  projectedCompletion: Date;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: GoalRecommendation[];
}

export interface MilestoneData {
  name: string;
  targetAmount: number;
  targetDate: Date;
  order: number;
  reward?: string;
}

export class GoalsService {
  
  /**
   * AI-Powered Goal Analysis and Recommendations
   */
  async analyzeGoal(goalId: number): Promise<GoalAnalytics> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal) throw new Error('Goal not found');

    const contributions = await this.getGoalContributions(goalId, 90); // Last 90 days
    const workspaceData = await this.getWorkspaceFinancialData(goal.workspaceId);
    
    // Calculate velocity (monthly contribution rate)
    const velocity = this.calculateVelocity(contributions);
    
    // Project completion date
    const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
    const monthsToComplete = velocity > 0 ? remaining / velocity : Infinity;
    const projectedCompletion = addMonths(new Date(), Math.ceil(monthsToComplete));
    
    // Calculate health score (0-100)
    const healthScore = this.calculateGoalHealthScore(goal, velocity, workspaceData);
    
    // Determine risk level
    const riskLevel = this.assessRiskLevel(goal, velocity, workspaceData);
    
    // Generate AI recommendations
    const recommendations = await this.generateRecommendations(goal, velocity, workspaceData);
    
    return {
      velocity,
      projectedCompletion,
      healthScore,
      riskLevel,
      recommendations
    };
  }

  /**
   * Auto-create intelligent milestones for a goal
   */
  async createIntelligentMilestones(goalId: number): Promise<void> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal) throw new Error('Goal not found');

    const targetAmount = parseFloat(goal.targetAmount);
    const currentAmount = parseFloat(goal.currentAmount);
    const remainingAmount = targetAmount - currentAmount;
    
    const targetDate = new Date(goal.targetDate);
    const now = new Date();
    const monthsRemaining = Math.max(1, Math.ceil(differenceInDays(targetDate, now) / 30));
    
    // Create intelligent milestone breakdown
    const milestones: MilestoneData[] = [];
    
    // Strategy based on goal type and amount
    if (remainingAmount >= 10000000) { // 10M+: Quarterly milestones
      const quarters = Math.min(8, Math.ceil(monthsRemaining / 3));
      const quarterlyAmount = remainingAmount / quarters;
      
      for (let i = 1; i <= quarters; i++) {
        const milestoneDate = addMonths(now, i * 3);
        if (isAfter(milestoneDate, targetDate)) break;
        
        milestones.push({
          name: `Quarter ${i} Target`,
          targetAmount: currentAmount + (quarterlyAmount * i),
          targetDate: milestoneDate,
          order: i,
          reward: i === Math.ceil(quarters / 2) ? 'Mid-goal celebration!' : undefined
        });
      }
    } else { // Monthly milestones for smaller goals
      const monthlyAmount = remainingAmount / monthsRemaining;
      
      for (let i = 1; i <= monthsRemaining; i++) {
        const milestoneDate = addMonths(now, i);
        if (isAfter(milestoneDate, targetDate)) break;
        
        milestones.push({
          name: `Month ${i} Target`,
          targetAmount: currentAmount + (monthlyAmount * i),
          targetDate: milestoneDate,
          order: i,
          reward: i % 3 === 0 ? 'Monthly reward treat!' : undefined
        });
      }
    }
    
    // Add final milestone
    milestones.push({
      name: 'Goal Achievement',
      targetAmount: targetAmount,
      targetDate: targetDate,
      order: milestones.length + 1,
      reward: '🎉 Goal Completed! Time to celebrate!'
    });
    
    // Save milestones to database
    for (const milestone of milestones) {
      await db.insert(goalMilestones).values({
        goalId,
        name: milestone.name,
        targetAmount: milestone.targetAmount.toString(),
        targetDate: format(milestone.targetDate, 'yyyy-MM-dd'),
        order: milestone.order,
        reward: milestone.reward
      });
    }
  }

  /**
   * Process transaction and update related goals automatically
   */
  async processTransactionForGoals(transactionId: number): Promise<void> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) return;

    // Find goals that should be updated by this transaction
    const applicableGoals = await this.findApplicableGoals(transaction);
    
    for (const goal of applicableGoals) {
      await this.updateGoalProgress(goal.id, transaction);
      await this.checkMilestoneCompletion(goal.id);
      await this.generateProgressInsight(goal.id, transaction);
    }
  }

  /**
   * Smart Goal Suggestions based on user's financial profile
   */
  async generateGoalSuggestions(workspaceId: number): Promise<GoalRecommendation[]> {
    const financialData = await this.getWorkspaceFinancialData(workspaceId);
    const suggestions: GoalRecommendation[] = [];
    
    // Emergency Fund Suggestion
    if (financialData.totalBalance < financialData.monthlyExpenses * 6) {
      const recommendedAmount = financialData.monthlyExpenses * 6;
      suggestions.push({
        type: 'strategy',
        title: 'Emergency Fund Critical',
        message: `Build emergency fund to ${this.formatCurrency(recommendedAmount)}. Currently you have ${this.formatCurrency(financialData.totalBalance)} saved.`,
        confidence: 0.95,
        actionable: true,
        data: {
          goalType: 'emergency_fund',
          targetAmount: recommendedAmount,
          priority: 'critical'
        }
      });
    }
    
    // Debt Payoff Strategy
    if (financialData.totalDebt > 0) {
      const monthlyCapacity = Math.max(0, financialData.monthlyIncome - financialData.monthlyExpenses);
      const payoffMonths = monthlyCapacity > 0 ? Math.ceil(financialData.totalDebt / monthlyCapacity) : 0;
      
      suggestions.push({
        type: 'strategy',
        title: 'Debt Freedom Goal',
        message: `Clear all debts in ${payoffMonths} months by allocating ${this.formatCurrency(monthlyCapacity)} monthly.`,
        confidence: 0.88,
        actionable: payoffMonths > 0,
        data: {
          goalType: 'debt_payment',
          targetAmount: financialData.totalDebt,
          monthlyContribution: monthlyCapacity
        }
      });
    }
    
    // Savings Goal based on income
    if (financialData.savingsRate > 0.2) { // Good savers
      const annualSavings = (financialData.monthlyIncome - financialData.monthlyExpenses) * 12;
      suggestions.push({
        type: 'amount',
        title: 'Wealth Building Opportunity',
        message: `Your savings rate is excellent! Consider setting a ${this.formatCurrency(annualSavings)} annual investment goal.`,
        confidence: 0.82,
        actionable: true,
        data: {
          goalType: 'investment',
          targetAmount: annualSavings,
          timeline: 'yearly'
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Update goal progress from a transaction
   */
  private async updateGoalProgress(goalId: number, transaction: any): Promise<void> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal || !goal.isAutoTracking) return;
    
    let contributionAmount = 0;
    let contributionType = 'transaction';
    
    // Calculate contribution based on goal type and transaction
    if (goal.linkedAccountId === transaction.accountId) {
      // Direct contribution to linked account
      if (transaction.type === 'income' || transaction.type === 'transfer') {
        contributionAmount = parseFloat(transaction.amount);
      }
    } else if (goal.linkedDebtId && transaction.debtId === goal.linkedDebtId) {
      // Debt payment goal
      if (transaction.type === 'repayment') {
        contributionAmount = parseFloat(transaction.amount);
      }
    }
    
    if (contributionAmount > 0) {
      // Record the contribution
      await db.insert(goalContributions).values({
        goalId,
        transactionId: transaction.id,
        amount: contributionAmount.toString(),
        contributionType,
        source: `${transaction.type} transaction`,
        date: transaction.date,
        workspaceId: transaction.workspaceId
      });
      
      // Update goal current amount
      const newCurrentAmount = parseFloat(goal.currentAmount) + contributionAmount;
      await db
        .update(goals)
        .set({
          currentAmount: newCurrentAmount.toString(),
          lastProgressUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(goals.id, goalId));
      
      // Check if goal is completed
      if (newCurrentAmount >= parseFloat(goal.targetAmount) && goal.status !== 'completed') {
        await db
          .update(goals)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(goals.id, goalId));
        
        // Create achievement insight
        await this.createAchievementInsight(goalId);
      }
    }
  }

  /**
   * Get goal with all related details
   */
  private async getGoalWithDetails(goalId: number) {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, goalId));
    
    return goal;
  }

  /**
   * Get goal contributions within specified days
   */
  private async getGoalContributions(goalId: number, days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(goalContributions)
      .where(
        and(
          eq(goalContributions.goalId, goalId),
          gte(goalContributions.date, cutoffDate)
        )
      )
      .orderBy(desc(goalContributions.date));
  }

  /**
   * Calculate monthly velocity from contributions
   */
  private calculateVelocity(contributions: any[]): number {
    if (contributions.length === 0) return 0;
    
    const totalAmount = contributions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const daysCovered = Math.max(1, differenceInDays(new Date(), new Date(contributions[contributions.length - 1].date)));
    const monthlyVelocity = (totalAmount / daysCovered) * 30;
    
    return monthlyVelocity;
  }

  /**
   * Calculate goal health score (0-100)
   */
  private calculateGoalHealthScore(goal: any, velocity: number, workspaceData: any): number {
    let score = 100;
    
    // Progress rate score (40% weight)
    const progressPercentage = parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount);
    const timeElapsed = differenceInDays(new Date(), new Date(goal.createdAt));
    const totalDays = differenceInDays(new Date(goal.targetDate), new Date(goal.createdAt));
    const expectedProgress = Math.max(0, timeElapsed / totalDays);
    
    if (progressPercentage < expectedProgress * 0.7) score -= 30;
    else if (progressPercentage < expectedProgress * 0.85) score -= 15;
    
    // Velocity consistency (30% weight)
    if (velocity === 0) score -= 25;
    else {
      const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
      const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
      const requiredMonthlyVelocity = remaining / (daysRemaining / 30);
      
      if (velocity < requiredMonthlyVelocity * 0.5) score -= 20;
      else if (velocity < requiredMonthlyVelocity * 0.8) score -= 10;
    }
    
    // Financial capacity (30% weight)
    const monthlyCapacity = workspaceData.monthlyIncome - workspaceData.monthlyExpenses;
    const goalDemand = velocity;
    
    if (goalDemand > monthlyCapacity * 0.8) score -= 20;
    else if (goalDemand > monthlyCapacity * 0.5) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess goal risk level
   */
  private assessRiskLevel(goal: any, velocity: number, workspaceData: any): 'low' | 'medium' | 'high' {
    const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
    const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
    const requiredMonthlyVelocity = remaining / (daysRemaining / 30);
    
    if (velocity >= requiredMonthlyVelocity * 1.2) return 'low';
    if (velocity >= requiredMonthlyVelocity * 0.8) return 'medium';
    return 'high';
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(goal: any, velocity: number, workspaceData: any): Promise<GoalRecommendation[]> {
    const recommendations: GoalRecommendation[] = [];
    const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
    const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
    const requiredMonthlyVelocity = remaining / (daysRemaining / 30);
    
    // Velocity recommendations
    if (velocity < requiredMonthlyVelocity * 0.8) {
      recommendations.push({
        type: 'amount',
        title: 'Increase Monthly Contribution',
        message: `Increase monthly contribution by ${this.formatCurrency(requiredMonthlyVelocity - velocity)} to stay on track.`,
        confidence: 0.9,
        actionable: true,
        data: { requiredIncrease: requiredMonthlyVelocity - velocity }
      });
    }
    
    // Timeline recommendations
    if (daysRemaining < 90 && remaining > velocity * 3) {
      recommendations.push({
        type: 'timeline',
        title: 'Consider Extending Timeline',
        message: `Goal timeline is aggressive. Consider extending by ${Math.ceil(remaining / velocity - daysRemaining / 30)} months for realistic achievement.`,
        confidence: 0.85,
        actionable: true,
        data: { suggestedExtension: Math.ceil(remaining / velocity - daysRemaining / 30) }
      });
    }
    
    // Budget optimization recommendations
    if (workspaceData.monthlyIncome - workspaceData.monthlyExpenses < requiredMonthlyVelocity) {
      recommendations.push({
        type: 'strategy',
        title: 'Budget Optimization Needed',
        message: 'Review expenses or increase income to create capacity for goal contributions.',
        confidence: 0.88,
        actionable: true,
        data: { deficit: requiredMonthlyVelocity - (workspaceData.monthlyIncome - workspaceData.monthlyExpenses) }
      });
    }
    
    return recommendations;
  }

  /**
   * Find goals applicable for a transaction
   */
  private async findApplicableGoals(transaction: any) {
    return await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.workspaceId, transaction.workspaceId),
          eq(goals.status, 'active'),
          eq(goals.isAutoTracking, true)
        )
      );
  }

  /**
   * Check and complete milestones
   */
  private async checkMilestoneCompletion(goalId: number): Promise<void> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal) return;
    
    const currentAmount = parseFloat(goal.currentAmount);
    
    // Get incomplete milestones
    const milestones = await db
      .select()
      .from(goalMilestones)
      .where(
        and(
          eq(goalMilestones.goalId, goalId),
          eq(goalMilestones.isCompleted, false)
        )
      )
      .orderBy(asc(goalMilestones.order));
    
    for (const milestone of milestones) {
      if (currentAmount >= parseFloat(milestone.targetAmount)) {
        await db
          .update(goalMilestones)
          .set({
            isCompleted: true,
            completedAt: new Date()
          })
          .where(eq(goalMilestones.id, milestone.id));
        
        // Create milestone achievement insight
        await db.insert(goalInsights).values({
          goalId,
          type: 'achievement',
          title: 'Milestone Achieved! 🎉',
          message: `Congratulations! You've reached milestone: ${milestone.name}${milestone.reward ? ` - ${milestone.reward}` : ''}`,
          severity: 'success',
          actionRequired: false,
          workspaceId: goal.workspaceId
        });
      } else {
        break; // Stop at first incomplete milestone
      }
    }
  }

  /**
   * Generate progress insight from transaction
   */
  private async generateProgressInsight(goalId: number, transaction: any): Promise<void> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal) return;
    
    const progressPercentage = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
    
    // Generate insights for major progress milestones
    if (progressPercentage >= 25 && progressPercentage < 30) {
      await this.createProgressInsight(goalId, 'Quarter way there!', `Great progress! You're 25% closer to your goal: ${goal.name}`, goal.workspaceId);
    } else if (progressPercentage >= 50 && progressPercentage < 55) {
      await this.createProgressInsight(goalId, 'Halfway milestone!', `Amazing! You're halfway to achieving: ${goal.name}`, goal.workspaceId);
    } else if (progressPercentage >= 75 && progressPercentage < 80) {
      await this.createProgressInsight(goalId, 'Almost there!', `Fantastic! You're 75% of the way to: ${goal.name}`, goal.workspaceId);
    }
  }

  /**
   * Create achievement insight
   */
  private async createAchievementInsight(goalId: number): Promise<void> {
    const goal = await this.getGoalWithDetails(goalId);
    if (!goal) return;
    
    await db.insert(goalInsights).values({
      goalId,
      type: 'achievement',
      title: 'Goal Achieved! 🎉',
      message: `Congratulations! You've successfully achieved your goal: ${goal.name}. Time to celebrate and set new aspirations!`,
      severity: 'success',
      actionRequired: false,
      workspaceId: goal.workspaceId
    });
  }

  /**
   * Create progress insight
   */
  private async createProgressInsight(goalId: number, title: string, message: string, workspaceId: number): Promise<void> {
    await db.insert(goalInsights).values({
      goalId,
      type: 'achievement',
      title,
      message,
      severity: 'success',
      actionRequired: false,
      workspaceId
    });
  }

  /**
   * Get comprehensive workspace financial data
   */
  private async getWorkspaceFinancialData(workspaceId: number) {
    // Get recent transactions for analysis
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.workspaceId, workspaceId))
      .orderBy(desc(transactions.createdAt))
      .limit(1000);
    
    // Calculate totals
    const totalBalance = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) -
      recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Get monthly averages (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentIncomeTransactions = recentTransactions
      .filter(t => t.type === 'income' && new Date(t.createdAt) >= threeMonthsAgo);
    const recentExpenseTransactions = recentTransactions
      .filter(t => t.type === 'expense' && new Date(t.createdAt) >= threeMonthsAgo);
    
    const monthlyIncome = recentIncomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) / 3;
    const monthlyExpenses = recentExpenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) / 3;
    
    // Get debt data
    const debtTransactions = recentTransactions.filter(t => t.type === 'repayment');
    const totalDebt = debtTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const savingsRate = monthlyIncome > 0 ? Math.max(0, (monthlyIncome - monthlyExpenses) / monthlyIncome) : 0;
    
    return {
      totalBalance,
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      savingsRate
    };
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

// Export singleton instance
export const goalsService = new GoalsService();