import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GoalSuggestion {
  id: number;
  title: string;
  description: string;
  type: string;
  recommendedAmount: number;
  timeline: string;
  priority: string;
  reasoning: string;
  confidence: number;
}

export interface GoalInsight {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  actionRequired: boolean;
  isRead: boolean;
  goalId?: number;
  data: any;
}

export class AIGoalsService {
  async generateGoalSuggestions(financialData: {
    transactions: any[];
    accounts: any[];
    budgets: any[];
    goals: any[];
    debts: any[];
    monthlyIncome: number;
    monthlyExpenses: number;
  }): Promise<GoalSuggestion[]> {
    try {
      const prompt = this.buildSuggestionsPrompt(financialData);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional financial advisor AI. Analyze financial data and provide personalized goal suggestions in JSON format. Be practical, specific, and consider Indonesian financial context (IDR currency)."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from OpenAI');

      const suggestions = JSON.parse(response);
      return suggestions.map((s: any, index: number) => ({
        id: index + 1,
        ...s,
        recommendedAmount: Math.round(s.recommendedAmount),
        confidence: Math.min(Math.max(s.confidence || 0.5, 0), 1)
      }));
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return this.getFallbackSuggestions(financialData);
    }
  }

  async generateGoalInsights(financialData: {
    transactions: any[];
    goals: any[];
    budgets: any[];
    monthlyIncome: number;
    monthlyExpenses: number;
  }): Promise<GoalInsight[]> {
    try {
      const prompt = this.buildInsightsPrompt(financialData);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a financial advisor AI. Analyze goal progress and financial patterns to provide actionable insights in JSON format. Focus on progress tracking, optimization suggestions, and milestone achievements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from OpenAI');

      const insights = JSON.parse(response);
      return insights.map((insight: any, index: number) => ({
        id: index + 1,
        ...insight,
        isRead: false
      }));
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return this.getFallbackInsights(financialData);
    }
  }

  private buildSuggestionsPrompt(data: any): string {
    const hasEmergencyFund = data.goals.some((g: any) => g.type === 'emergency_fund');
    const totalSavings = data.accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || '0'), 0);
    const savingsRate = data.monthlyIncome > 0 ? (data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome : 0;
    
    return `
Analyze this financial profile and suggest 2-4 personalized financial goals:

FINANCIAL DATA:
- Monthly Income: Rp ${data.monthlyIncome.toLocaleString('id-ID')}
- Monthly Expenses: Rp ${data.monthlyExpenses.toLocaleString('id-ID')}
- Total Savings: Rp ${totalSavings.toLocaleString('id-ID')}
- Savings Rate: ${(savingsRate * 100).toFixed(1)}%
- Current Goals: ${data.goals.length} (${data.goals.map((g: any) => g.type).join(', ')})
- Total Debt: Rp ${data.debts.reduce((sum: number, d: any) => sum + parseFloat(d.amount || '0'), 0).toLocaleString('id-ID')}
- Has Emergency Fund: ${hasEmergencyFund}

REQUIREMENTS:
- Provide suggestions as JSON array
- Include Indonesian context (IDR amounts, local financial practices)
- Prioritize based on financial health fundamentals
- Each suggestion should have: title, description, type, recommendedAmount, timeline, priority, reasoning, confidence

GOAL TYPES: savings, debt_payment, investment, emergency_fund, vacation, house, education, retirement

PRIORITIES: low, medium, high, critical

TIMELINE FORMAT: "6months", "12months", "24months", "5years"

Return only valid JSON array without any additional text.
    `;
  }

  private buildInsightsPrompt(data: any): string {
    const recentTransactions = data.transactions.slice(-20);
    const goalProgress = data.goals.map((g: any) => {
      const progress = (parseFloat(g.currentAmount || '0') / parseFloat(g.targetAmount || '1')) * 100;
      return { ...g, progress };
    });

    return `
Analyze financial patterns and goal progress to generate actionable insights:

FINANCIAL DATA:
- Recent Transactions: ${recentTransactions.length} transactions
- Active Goals: ${data.goals.length}
- Monthly Income: Rp ${data.monthlyIncome.toLocaleString('id-ID')}
- Monthly Expenses: Rp ${data.monthlyExpenses.toLocaleString('id-ID')}

GOAL PROGRESS:
${goalProgress.map(g => `- ${g.name}: ${g.progress.toFixed(1)}% complete (Rp ${parseFloat(g.currentAmount || '0').toLocaleString('id-ID')} / Rp ${parseFloat(g.targetAmount || '0').toLocaleString('id-ID')})`).join('\n')}

REQUIREMENTS:
- Provide insights as JSON array
- Focus on progress updates, optimization tips, milestone achievements
- Each insight should have: type, title, message, severity, actionRequired, goalId (if applicable), data
- INSIGHT TYPES: milestone_achieved, progress_slow, optimization_tip, warning, achievement
- SEVERITY: info, warning, success, error

Return only valid JSON array without any additional text.
    `;
  }

  private getFallbackSuggestions(data: any): GoalSuggestion[] {
    const suggestions: GoalSuggestion[] = [];
    
    // Emergency fund if missing
    const hasEmergencyFund = data.goals.some((g: any) => g.type === 'emergency_fund');
    if (!hasEmergencyFund && data.monthlyExpenses > 0) {
      suggestions.push({
        id: 1,
        title: 'Emergency Fund',
        description: 'Build an emergency fund covering 6 months of expenses',
        type: 'emergency_fund',
        recommendedAmount: data.monthlyExpenses * 6,
        timeline: '12months',
        priority: 'high',
        reasoning: 'Essential financial safety net for unexpected expenses',
        confidence: 0.95
      });
    }

    // Savings goal based on income
    if (data.monthlyIncome > data.monthlyExpenses) {
      const surplus = data.monthlyIncome - data.monthlyExpenses;
      suggestions.push({
        id: 2,
        title: 'Monthly Savings Goal',
        description: 'Systematic saving plan based on your income surplus',
        type: 'savings',
        recommendedAmount: surplus * 12,
        timeline: '12months',
        priority: 'medium',
        reasoning: 'Maximize your monthly surplus for long-term wealth building',
        confidence: 0.85
      });
    }

    return suggestions;
  }

  private getFallbackInsights(data: any): GoalInsight[] {
    const insights: GoalInsight[] = [];

    // Check for goal progress
    data.goals.forEach((goal: any, index: number) => {
      const progress = (parseFloat(goal.currentAmount || '0') / parseFloat(goal.targetAmount || '1')) * 100;
      
      if (progress >= 25 && progress < 30) {
        insights.push({
          id: index + 1,
          type: 'milestone_achieved',
          title: 'Quarter Milestone Reached!',
          message: `You've completed 25% of your ${goal.name} goal`,
          severity: 'success',
          actionRequired: false,
          isRead: false,
          goalId: goal.id,
          data: { progress: Math.round(progress) }
        });
      }
    });

    return insights;
  }
}

export const aiGoalsService = new AIGoalsService();