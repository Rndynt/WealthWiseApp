import { eq, desc, asc, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from './db.js';
import {
  goals,
  goalContributions,
  goalMilestones,
  goalInsights,
  transactions,
  accounts,
  debts,
  budgets,
  categories,
  notifications,
  workspaces,
  type Goal,
  type GoalContribution,
  type GoalMilestone,
  type GoalInsight,
  type InsertGoal,
  type InsertGoalContribution,
  type InsertGoalMilestone,
  type InsertGoalInsight,
  type InsertNotification,
} from '@shared/schema.js';
import { differenceInDays, addMonths, addDays, format, parseISO, isBefore, isAfter } from 'date-fns';

export interface GoalAnalytics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  pausedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  averageProgress: number;
  goalsByType: Record<string, number>;
  goalsByPriority: Record<string, number>;
  monthlyContributions: number;
  projectedCompletionDate?: string;
}

export interface GoalSuggestion {
  type: string;
  title: string;
  description: string;
  recommendedAmount: number;
  priority: string;
  reasoning: string;
  confidence: number;
  timeline: string;
}

export interface GoalRecommendation {
  goalId: number;
  type: 'milestone_adjustment' | 'contribution_increase' | 'deadline_extension' | 'priority_change' | 'automation_suggestion';
  title: string;
  description: string;
  impact: string;
  actionRequired: boolean;
  data?: any;
}

export class GoalsEnhancedService {
  // Auto-progress tracking from transactions
  async updateGoalProgress(goalId: number, workspaceId: number): Promise<void> {
    const goal = await db.select().from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.workspaceId, workspaceId)))
      .limit(1);

    if (!goal[0] || !goal[0].isAutoTracking) return;

    const linkedDebtId = goal[0].linkedDebtId;
    let newAmount = 0;

    // ✅ FIXED: Always calculate from contributions for accuracy
    const contributions = await db.select()
      .from(goalContributions)
      .where(and(
        eq(goalContributions.goalId, goalId),
        eq(goalContributions.workspaceId, workspaceId)
      ));

    // Calculate total contributions based on goal type logic
    if (goal[0].type === 'debt_payment' && linkedDebtId) {
      // For debt payment goals: use debt payment progress
      const debt = await db.select().from(debts)
        .where(eq(debts.id, linkedDebtId))
        .limit(1);
      
      if (debt[0]) {
        const paidAmount = parseFloat(debt[0].totalAmount) - parseFloat(debt[0].remainingAmount);
        newAmount = paidAmount;
      }
    } else {
      // For all other goals: calculate from actual contributions
      newAmount = contributions.reduce((sum, contrib) => {
        const contributionAmount = parseFloat(contrib.amount);
        
        // Apply proper contribution logic based on goal type and transaction type
        if (goal[0].type === 'vacation' || goal[0].type === 'house') {
          // For vacation/house: positive contributions from savings, negative from expenses
          const transaction = contrib.contributionType === 'transaction' || contrib.contributionType === 'auto_categorized';
          const description = contrib.source?.toLowerCase() || '';
          
          // If it's an expense (not savings), it reduces the goal amount
          if (description.includes('expense') || description.includes('flight') || description.includes('consultation')) {
            return sum; // Don't add expenses to goal progress for vacation/house
          }
        }
        
        return sum + contributionAmount;
      }, 0);
    }

    // Ensure newAmount is not negative
    newAmount = Math.max(0, newAmount);

    // Update goal progress
    await db.update(goals)
      .set({
        currentAmount: newAmount.toString(),
        lastProgressUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(goals.id, goalId));

    // Check if goal is completed
    const progress = (newAmount / parseFloat(goal[0].targetAmount)) * 100;
    if (progress >= 100 && goal[0].status !== 'completed') {
      await this.completeGoal(goalId, workspaceId);
    }

    // Update milestones
    await this.updateMilestoneProgress(goalId, newAmount);
  }

  // Smart transaction recognition and contribution tracking
  async processTransactionForGoals(transactionId: number, workspaceId: number): Promise<{ tracked: number; goals: string[] }> {
    const transaction = await db.select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!transaction[0]) return { tracked: 0, goals: [] };

    // Find goals that might be affected by this transaction
    const relevantGoals = await db.select()
      .from(goals)
      .where(and(
        eq(goals.workspaceId, workspaceId),
        eq(goals.isAutoTracking, true),
        eq(goals.status, 'active')
      ));

    const trackedGoals: string[] = [];
    let trackedCount = 0;

    for (const goal of relevantGoals) {
      let shouldTrack = false;
      let contributionType = 'transaction';
      let matchingReason = '';

      // Check if transaction affects this goal - Account linking
      if (goal.linkedAccountId === transaction[0].accountId) {
        shouldTrack = true;
        matchingReason = `Account: ${goal.linkedAccountId}`;
      }

      // Check for debt payment goals - Debt linking
      if (goal.type === 'debt_payment' && goal.linkedDebtId === transaction[0].debtId) {
        shouldTrack = true;
        contributionType = 'debt_payment';
        matchingReason = `Debt: ${goal.linkedDebtId}`;
      }

      // Smart categorization based on goal type and transaction description
      if (!shouldTrack) {
        const description = transaction[0].description.toLowerCase();
        const goalType = goal.type;
        
        const keywordMatches = this.getGoalKeywords(goalType);
        const matchedKeywords = keywordMatches.filter(keyword => description.includes(keyword));
        
        if (matchedKeywords.length > 0) {
          shouldTrack = true;
          contributionType = 'auto_categorized';
          matchingReason = `Keywords: ${matchedKeywords.join(', ')}`;
        }
      }

      // Enhanced logic: Process tracking based on goal type and transaction type relevance
      const shouldProcessTransaction = this.shouldTrackTransactionForGoal(
        transaction[0].type,
        goal.type,
        parseFloat(transaction[0].amount),
        matchingReason
      );

      if (shouldTrack && shouldProcessTransaction) {
        try {
          // Check for duplicate contributions
          const existingContribution = await db.select()
            .from(goalContributions)
            .where(and(
              eq(goalContributions.goalId, goal.id),
              eq(goalContributions.transactionId, transaction[0].id)
            ))
            .limit(1);

          if (existingContribution.length === 0) {
            // Create goal contribution record
            await db.insert(goalContributions).values({
              goalId: goal.id,
              transactionId: transaction[0].id,
              amount: transaction[0].amount,
              contributionType,
              source: `Auto-tracked from ${transaction[0].description} (${matchingReason})`,
              date: transaction[0].date,
              workspaceId,
            });

            // Update goal progress
            await this.updateGoalProgress(goal.id, workspaceId);
            
            trackedGoals.push(`${goal.name} (${matchingReason})`);
            trackedCount++;

            // Create notification for successful auto-tracking
            await db.insert(notifications).values({
              workspaceId,
              userId: null, // Workspace-level notification
              type: 'goal_progress',
              title: 'Goal Auto-Tracked',
              message: `Transaction "${transaction[0].description}" (${transaction[0].amount}) was automatically linked to goal "${goal.name}"`,
              isRead: false,
              createdAt: new Date()
            });

            console.log(`✅ Auto-tracked: ${goal.name} <- ${transaction[0].description} (${matchingReason})`);
          } else {
            console.log(`⚠️  Duplicate avoided: ${goal.name} <- ${transaction[0].description}`);
          }
        } catch (error) {
          console.error(`❌ Auto-tracking failed for goal ${goal.name}:`, error);
        }
      }
    }

    return { tracked: trackedCount, goals: trackedGoals };
  }

  // AI-powered goal suggestions
  async generateGoalSuggestions(workspaceId: number): Promise<GoalSuggestion[]> {
    const suggestions: GoalSuggestion[] = [];

    // Analyze spending patterns
    const spendingAnalysis = await this.analyzeSpendingPatterns(workspaceId);
    const incomeAnalysis = await this.analyzeIncomePatterns(workspaceId);
    const existingGoals = await db.select().from(goals)
      .where(eq(goals.workspaceId, workspaceId));

    // Emergency Fund Suggestion - More comprehensive check
    const emergencyGoals = existingGoals.filter(g => 
      g.type === 'emergency_fund' || 
      g.name.toLowerCase().includes('emergency') ||
      g.description?.toLowerCase().includes('emergency fund')
    );
    
    if (emergencyGoals.length === 0) {
      const monthlyExpenses = spendingAnalysis.averageMonthlyExpenses;
      const emergencyFundTarget = monthlyExpenses * 6; // 6 months of expenses

      suggestions.push({
        type: 'emergency_fund',
        title: 'Build Emergency Fund',
        description: 'Create a safety net covering 6 months of expenses',
        recommendedAmount: emergencyFundTarget,
        priority: 'critical',
        reasoning: `Based on your average monthly expenses of $${monthlyExpenses.toFixed(2)}, you should have $${emergencyFundTarget.toFixed(2)} in emergency savings.`,
        confidence: 0.95,
        timeline: '12-18 months'
      });
    }

    // Debt Payment Goals
    const activeDebts = await db.select().from(debts)
      .where(and(
        eq(debts.workspaceId, workspaceId),
        eq(debts.status, 'active')
      ));

    for (const debt of activeDebts) {
      // More comprehensive check for existing debt payment goals
      const hasDebtGoal = existingGoals.some(g => 
        g.linkedDebtId === debt.id || 
        g.type === 'debt_payment' && (
          g.name.toLowerCase().includes(debt.name.toLowerCase()) ||
          g.description?.toLowerCase().includes(debt.name.toLowerCase())
        )
      );
      
      if (!hasDebtGoal) {
        suggestions.push({
          type: 'debt_payment',
          title: `Pay Off ${debt.name}`,
          description: `Eliminate ${debt.name} debt strategically`,
          recommendedAmount: parseFloat(debt.remainingAmount),
          priority: debt.interestRate && parseFloat(debt.interestRate) > 15 ? 'high' : 'medium',
          reasoning: `High-interest debt should be prioritized. Interest rate: ${debt.interestRate}%`,
          confidence: 0.9,
          timeline: this.calculateDebtPayoffTimeline(debt, incomeAnalysis.disposableIncome)
        });
      }
    }

    // Savings Goals based on spending patterns
    const categorySpending = spendingAnalysis.categoryBreakdown;
    
    // Vacation fund suggestion - Enhanced checking
    const entertainmentSpending = categorySpending['entertainment'] || 0;
    const hasVacationGoal = existingGoals.some(g => 
      g.type === 'vacation' || 
      g.name.toLowerCase().includes('vacation') ||
      g.name.toLowerCase().includes('holiday') ||
      g.name.toLowerCase().includes('travel') ||
      g.description?.toLowerCase().includes('vacation')
    );
    
    if (entertainmentSpending > 200 && !hasVacationGoal) {
      suggestions.push({
        type: 'vacation',
        title: 'Vacation Fund',
        description: 'Save for your dream vacation',
        recommendedAmount: entertainmentSpending * 12, // Annual entertainment budget
        priority: 'medium',
        reasoning: `You spend about $${entertainmentSpending.toFixed(2)} monthly on entertainment. A vacation fund could enhance your leisure experiences.`,
        confidence: 0.7,
        timeline: '12 months'
      });
    }

    // House down payment
    const currentSavingsRate = incomeAnalysis.savingsRate;
    if (currentSavingsRate > 0.15 && !existingGoals.some(g => g.type === 'house')) {
      const houseDownPayment = incomeAnalysis.monthlyIncome * 12 * 3; // 3x annual income

      suggestions.push({
        type: 'house',
        title: 'House Down Payment',
        description: 'Save for your future home',
        recommendedAmount: houseDownPayment,
        priority: 'high',
        reasoning: `Your savings rate of ${(currentSavingsRate * 100).toFixed(1)}% indicates you could save for a home down payment.`,
        confidence: 0.8,
        timeline: '5-7 years'
      });
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  // Enhanced keyword matching for auto-categorization
  private getGoalKeywords(goalType: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'emergency_fund': ['emergency', 'urgent', 'backup', 'reserve', 'safety', 'fund'],
      'vacation': ['vacation', 'holiday', 'travel', 'trip', 'flight', 'hotel', 'tour'],
      'house': ['house', 'home', 'property', 'mortgage', 'down payment', 'real estate'],
      'debt_payment': ['debt', 'payment', 'loan', 'credit', 'installment', 'payoff'],
      'investment': ['invest', 'portfolio', 'stock', 'bond', 'mutual fund', 'trading'],
      'education': ['education', 'school', 'course', 'training', 'certification', 'tuition'],
      'retirement': ['retirement', 'pension', 'ira', '401k', 'senior', 'elderly'],
      'savings': ['saving', 'save', 'deposit', 'accumulate', 'reserve']
    };

    return keywordMap[goalType] || [];
  }

  // Enhanced transaction relevance logic for goal tracking
  private shouldTrackTransactionForGoal(
    transactionType: string,
    goalType: string,
    amount: number,
    matchingReason: string
  ): boolean {
    if (amount <= 0) return false;

    // Account/Debt linking always takes priority (regardless of transaction type)
    if (matchingReason.includes('Account:') || matchingReason.includes('Debt:')) {
      return this.isTransactionRelevantForLinkedGoal(transactionType, goalType);
    }

    // Smart categorization based on goal type and transaction type
    const relevanceMatrix: Record<string, string[]> = {
      // Savings-related goals: Income contributions, savings transactions, transfers to savings accounts
      'savings': ['income', 'saving', 'transfer'],
      'emergency_fund': ['income', 'saving', 'transfer'],
      'retirement': ['income', 'saving', 'transfer'],
      
      // Investment goals: Income for investment, savings for investment
      'investment': ['income', 'saving', 'transfer'],
      
      // Expense-based goals: Expenses that contribute to the goal
      'vacation': ['expense', 'saving'], // Vacation spending + savings for vacation
      'house': ['income', 'saving', 'expense'], // Income/savings + house-related expenses
      'education': ['expense', 'saving'], // Education expenses + savings for education
      
      // Debt payment goals: Repayments, debt payments, transfers to pay debt
      'debt_payment': ['repayment', 'debt', 'transfer', 'expense']
    };

    const relevantTypes = relevanceMatrix[goalType] || [];
    return relevantTypes.includes(transactionType);
  }

  // Check transaction relevance for linked accounts/debts
  private isTransactionRelevantForLinkedGoal(transactionType: string, goalType: string): boolean {
    // For account-linked goals
    if (goalType === 'savings' || goalType === 'emergency_fund' || goalType === 'retirement') {
      // Track income, savings, and inbound transfers to savings accounts
      return ['income', 'saving', 'transfer'].includes(transactionType);
    }

    // For debt-linked goals
    if (goalType === 'debt_payment') {
      // Track repayments, debt payments, and transfers for debt payment
      return ['repayment', 'debt', 'transfer', 'expense'].includes(transactionType);
    }

    // For other goal types with linked accounts
    return ['income', 'saving', 'expense', 'transfer'].includes(transactionType);
  }

  // Smart milestone creation
  async createSmartMilestones(goalId: number): Promise<void> {
    const goal = await db.select().from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    if (!goal[0]) return;

    const targetAmount = parseFloat(goal[0].targetAmount);
    const targetDate = new Date(goal[0].targetDate);
    const startDate = new Date();
    const monthsDifference = differenceInDays(targetDate, startDate) / 30;

    // Create quarterly milestones
    const numberOfMilestones = Math.min(Math.ceil(monthsDifference / 3), 8); // Max 8 milestones
    const amountPerMilestone = targetAmount / numberOfMilestones;

    const milestones: InsertGoalMilestone[] = [];

    for (let i = 1; i <= numberOfMilestones; i++) {
      const milestoneDate = addMonths(startDate, i * 3);
      const milestoneAmount = amountPerMilestone * i;

      milestones.push({
        goalId: goalId,
        name: `Milestone ${i}: ${Math.round((i / numberOfMilestones) * 100)}%`,
        targetAmount: milestoneAmount.toString(),
        targetDate: format(milestoneDate, 'yyyy-MM-dd'),
        order: i,
        reward: this.generateMilestoneReward(i, numberOfMilestones, goal[0].type),
      });
    }

    await db.insert(goalMilestones).values(milestones);
  }

  // Update milestone progress
  async updateMilestoneProgress(goalId: number, currentAmount: number): Promise<void> {
    const milestones = await db.select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(asc(goalMilestones.order));

    for (const milestone of milestones) {
      const targetAmount = parseFloat(milestone.targetAmount);
      
      if (currentAmount >= targetAmount && !milestone.isCompleted) {
        await db.update(goalMilestones)
          .set({
            isCompleted: true,
            completedAt: new Date(),
          })
          .where(eq(goalMilestones.id, milestone.id));

        // Create achievement notification
        await this.createGoalNotification(
          goalId,
          'achievement',
          'Milestone Achieved!',
          `You've reached milestone: ${milestone.name}`,
          { milestoneId: milestone.id, reward: milestone.reward }
        );
      }
    }
  }

  // Generate AI-powered insights
  async generateGoalInsights(goalId: number, workspaceId: number): Promise<void> {
    const goal = await db.select().from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    if (!goal[0]) return;

    const insights: InsertGoalInsight[] = [];
    const currentAmount = parseFloat(goal[0].currentAmount);
    const targetAmount = parseFloat(goal[0].targetAmount);
    const progress = (currentAmount / targetAmount) * 100;
    const targetDate = new Date(goal[0].targetDate);
    const daysLeft = differenceInDays(targetDate, new Date());

    // Progress analysis
    if (progress < 25 && daysLeft < 90) {
      insights.push({
        goalId,
        type: 'alert',
        title: 'Goal At Risk',
        message: `Your goal is ${progress.toFixed(1)}% complete with only ${daysLeft} days remaining. Consider increasing contributions or extending the deadline.`,
        severity: 'warning',
        actionRequired: true,
        data: { currentProgress: progress, daysLeft, suggestedIncrease: 50 },
        workspaceId,
      });
    }

    // Contribution pattern analysis
    const recentContributions = await db.select()
      .from(goalContributions)
      .where(and(
        eq(goalContributions.goalId, goalId),
        gte(goalContributions.date, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
      ));

    const monthlyContribution = recentContributions.reduce((sum, contrib) => 
      sum + parseFloat(contrib.amount), 0) / 3; // 3 months average

    const requiredMonthlyContribution = (targetAmount - currentAmount) / (daysLeft / 30);

    if (monthlyContribution < requiredMonthlyContribution * 0.8) {
      insights.push({
        goalId,
        type: 'recommendation',
        title: 'Increase Monthly Contributions',
        message: `To reach your goal on time, consider increasing monthly contributions from $${monthlyContribution.toFixed(2)} to $${requiredMonthlyContribution.toFixed(2)}.`,
        severity: 'info',
        actionRequired: false,
        data: { 
          currentMonthly: monthlyContribution, 
          requiredMonthly: requiredMonthlyContribution,
          shortfall: requiredMonthlyContribution - monthlyContribution
        },
        workspaceId,
      });
    }

    // Automation suggestions
    if (!goal[0].isAutoTracking) {
      insights.push({
        goalId,
        type: 'recommendation',
        title: 'Enable Auto-Tracking',
        message: 'Enable automatic progress tracking to reduce manual updates and get real-time insights.',
        severity: 'info',
        actionRequired: false,
        data: { feature: 'auto_tracking' },
        workspaceId,
      });
    }

    if (insights.length > 0) {
      await db.insert(goalInsights).values(insights);
    }
  }

  // Financial health integration
  async calculateGoalImpactOnFinancialHealth(workspaceId: number): Promise<{
    overallScore: number;
    goalContribution: number;
    recommendations: string[];
  }> {
    const activeGoals = await db.select().from(goals)
      .where(and(
        eq(goals.workspaceId, workspaceId),
        eq(goals.status, 'active')
      ));

    let totalScore = 0;
    let goalContribution = 0;
    const recommendations: string[] = [];

    // Emergency fund impact (30% of score)
    const emergencyFundGoal = activeGoals.find(g => g.type === 'emergency_fund');
    if (emergencyFundGoal) {
      const progress = parseFloat(emergencyFundGoal.currentAmount) / parseFloat(emergencyFundGoal.targetAmount);
      goalContribution += Math.min(progress, 1) * 30;
    } else {
      recommendations.push('Create an emergency fund goal for financial security');
    }

    // Debt management impact (25% of score)
    const debtGoals = activeGoals.filter(g => g.type === 'debt_payment');
    if (debtGoals.length > 0) {
      const avgProgress = debtGoals.reduce((sum, goal) => {
        return sum + (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount));
      }, 0) / debtGoals.length;
      goalContribution += Math.min(avgProgress, 1) * 25;
    }

    // Savings goals impact (25% of score)
    const savingsGoals = activeGoals.filter(g => 
      ['savings', 'vacation', 'house', 'education'].includes(g.type));
    if (savingsGoals.length > 0) {
      const avgProgress = savingsGoals.reduce((sum, goal) => {
        return sum + (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount));
      }, 0) / savingsGoals.length;
      goalContribution += Math.min(avgProgress, 1) * 25;
    }

    // Investment goals impact (20% of score)
    const investmentGoals = activeGoals.filter(g => 
      ['investment', 'retirement'].includes(g.type));
    if (investmentGoals.length > 0) {
      const avgProgress = investmentGoals.reduce((sum, goal) => {
        return sum + (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount));
      }, 0) / investmentGoals.length;
      goalContribution += Math.min(avgProgress, 1) * 20;
    }

    totalScore = goalContribution;

    return {
      overallScore: totalScore,
      goalContribution,
      recommendations
    };
  }

  // Complete a goal
  async completeGoal(goalId: number, workspaceId: number): Promise<void> {
    await db.update(goals)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(goals.id, goalId));

    // Create completion notification
    const goal = await db.select().from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    if (goal[0]) {
      await this.createGoalNotification(
        goalId,
        'achievement',
        'Goal Completed! 🎉',
        `Congratulations! You've successfully completed "${goal[0].name}"`,
        { goalId, completionDate: new Date().toISOString() }
      );
    }
  }

  // Helper methods (duplicate removed)

  private generateMilestoneReward(order: number, total: number, goalType: string): string {
    const rewardSuggestions: Record<string, string[]> = {
      vacation: ['Plan your itinerary', 'Book accommodation', 'Treat yourself to a nice meal'],
      house: ['Visit open houses', 'Research neighborhoods', 'Celebrate with family dinner'],
      education: ['Buy study materials', 'Enroll in a prep course', 'Reward yourself with a book'],
      emergency_fund: ['Peace of mind achieved', 'Celebrate financial security', 'Treat yourself responsibly'],
    };

    const rewards = rewardSuggestions[goalType] || ['Celebrate your progress', 'Treat yourself', 'Share your achievement'];
    return rewards[Math.min(order - 1, rewards.length - 1)];
  }

  private calculateDebtPayoffTimeline(debt: any, disposableIncome: number): string {
    const remainingAmount = parseFloat(debt.remainingAmount);
    const monthlyPayment = Math.max(disposableIncome * 0.2, 100); // 20% of disposable income or $100 minimum
    const months = Math.ceil(remainingAmount / monthlyPayment);
    
    if (months <= 12) return `${months} months`;
    return `${Math.ceil(months / 12)} years`;
  }

  private async analyzeSpendingPatterns(workspaceId: number): Promise<{
    averageMonthlyExpenses: number;
    categoryBreakdown: Record<string, number>;
  }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const expenses = await db.select()
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, threeMonthsAgo)
      ));

    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.transactions.amount), 0);
    const averageMonthlyExpenses = totalExpenses / 3;

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(expense => {
      const categoryName = expense.categories.name.toLowerCase();
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + parseFloat(expense.transactions.amount);
    });

    return { averageMonthlyExpenses, categoryBreakdown };
  }

  private async analyzeIncomePatterns(workspaceId: number): Promise<{
    monthlyIncome: number;
    disposableIncome: number;
    savingsRate: number;
  }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const income = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.type, 'income'),
        gte(transactions.date, threeMonthsAgo)
      ));

    const expenses = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, threeMonthsAgo)
      ));

    const totalIncome = income.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const monthlyIncome = totalIncome / 3;
    const monthlyExpenses = totalExpenses / 3;
    const disposableIncome = monthlyIncome - monthlyExpenses;
    const savingsRate = disposableIncome / monthlyIncome;

    return { monthlyIncome, disposableIncome, savingsRate };
  }

  private async createGoalNotification(
    goalId: number,
    type: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const goal = await db.select().from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    if (goal[0]) {
      const notification: InsertNotification = {
        workspaceId: goal[0].workspaceId,
        type: type === 'achievement' ? 'success' : 'info',
        title,
        message,
        category: 'goal',
        data,
      };

      await db.insert(notifications).values(notification);
    }
  }
}

export const goalsEnhancedService = new GoalsEnhancedService();