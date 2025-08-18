import { db } from './db';
import { goals, goalContributions, transactions } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GoalMatchScore {
  goalId: number;
  goalName: string;
  goalType: string;
  totalScore: number;
  criteria: {
    accountLinking: number;    // 0-40 points
    keywordRelevance: number;  // 0-30 points  
    transactionContext: number;// 0-20 points
    aiSemanticMatch: number;   // 0-10 points
  };
  confidence: number;
  reasoning: string;
  matchingFactors: string[];
}

export interface GoalMatchResult {
  selectedGoal: GoalMatchScore | null;
  allScores: GoalMatchScore[];
  decision: 'matched' | 'no_match' | 'multiple_ties';
  reasoning: string;
}

export interface TransactionContext {
  id: number;
  description: string;
  amount: string;
  type: string;
  accountId: number | null;
  debtId: number | null;
  category: string | null;
  date: Date;
}

export class SmartGoalMatcherService {
  
  async findBestGoalMatch(
    transaction: TransactionContext, 
    workspaceId: number
  ): Promise<GoalMatchResult> {
    
    // Get all eligible goals for auto-tracking
    const eligibleGoals = await db.select()
      .from(goals)
      .where(and(
        eq(goals.workspaceId, workspaceId),
        eq(goals.isAutoTracking, true),
        eq(goals.status, 'active')
      ));

    if (eligibleGoals.length === 0) {
      return {
        selectedGoal: null,
        allScores: [],
        decision: 'no_match',
        reasoning: 'No eligible goals found for auto-tracking'
      };
    }

    // Calculate scores for each goal
    const goalScores: GoalMatchScore[] = [];
    
    for (const goal of eligibleGoals) {
      const score = await this.calculateGoalMatchScore(transaction, goal);
      goalScores.push(score);
    }

    // Sort by total score (descending)
    goalScores.sort((a, b) => b.totalScore - a.totalScore);

    // Apply minimum threshold (25 points)
    const MIN_THRESHOLD = 25;
    const qualifyingGoals = goalScores.filter(score => score.totalScore >= MIN_THRESHOLD);

    if (qualifyingGoals.length === 0) {
      return {
        selectedGoal: null,
        allScores: goalScores,
        decision: 'no_match',
        reasoning: `No goals met minimum threshold of ${MIN_THRESHOLD} points. Highest score: ${goalScores[0]?.totalScore || 0}`
      };
    }

    // Check for ties at the top
    const topScore = qualifyingGoals[0].totalScore;
    const topGoals = qualifyingGoals.filter(goal => goal.totalScore === topScore);

    let selectedGoal: GoalMatchScore;

    if (topGoals.length === 1) {
      selectedGoal = topGoals[0];
      return {
        selectedGoal,
        allScores: goalScores,
        decision: 'matched',
        reasoning: `Clear winner with score ${topScore}. ${selectedGoal.reasoning}`
      };
    }

    // Handle ties using tiebreaker logic
    selectedGoal = this.resolveTie(topGoals, transaction);
    
    return {
      selectedGoal,
      allScores: goalScores,
      decision: 'matched',
      reasoning: `Tie resolved using tiebreaker logic. Selected "${selectedGoal.goalName}" with score ${selectedGoal.totalScore}. ${selectedGoal.reasoning}`
    };
  }

  private async calculateGoalMatchScore(
    transaction: TransactionContext,
    goal: any
  ): Promise<GoalMatchScore> {
    
    const matchingFactors: string[] = [];
    
    // 1. Account Linking Score (0-40 points)
    const accountScore = this.calculateAccountLinkingScore(transaction, goal, matchingFactors);
    
    // 2. Keyword Relevance Score (0-30 points)  
    const keywordScore = this.calculateKeywordRelevanceScore(transaction, goal, matchingFactors);
    
    // 3. Transaction Context Score (0-20 points)
    const contextScore = this.calculateTransactionContextScore(transaction, goal, matchingFactors);
    
    // 4. AI Semantic Match Score (0-10 points)
    const aiScore = await this.calculateAISemanticScore(transaction, goal, matchingFactors);

    const totalScore = accountScore + keywordScore + contextScore + aiScore;
    const confidence = this.calculateConfidence(accountScore, keywordScore, contextScore, aiScore);

    return {
      goalId: goal.id,
      goalName: goal.name,
      goalType: goal.type,
      totalScore,
      criteria: {
        accountLinking: accountScore,
        keywordRelevance: keywordScore,
        transactionContext: contextScore,
        aiSemanticMatch: aiScore
      },
      confidence,
      reasoning: this.buildReasoningText(goal, matchingFactors, totalScore),
      matchingFactors
    };
  }

  private calculateAccountLinkingScore(
    transaction: TransactionContext, 
    goal: any, 
    factors: string[]
  ): number {
    
    // Direct account match
    if (goal.linkedAccountId && goal.linkedAccountId === transaction.accountId) {
      factors.push(`Direct account link (Account ID: ${goal.linkedAccountId})`);
      return 40;
    }

    // Debt payment match  
    if (goal.type === 'debt_payment' && goal.linkedDebtId === transaction.debtId) {
      factors.push(`Direct debt link (Debt ID: ${goal.linkedDebtId})`);
      return 40;
    }

    return 0;
  }

  private calculateKeywordRelevanceScore(
    transaction: TransactionContext,
    goal: any,
    factors: string[]
  ): number {
    const description = transaction.description.toLowerCase();
    const goalKeywords = this.getGoalKeywords(goal.type);
    const goalNameWords = goal.name.toLowerCase().split(' ');
    const goalDescriptionWords = goal.description ? goal.description.toLowerCase().split(' ') : [];
    
    let score = 0;
    const matchedKeywords: string[] = [];

    // Check goal type keywords
    for (const keyword of goalKeywords) {
      if (description.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 10; // 10 points per keyword match
      }
    }

    // Check goal name words
    for (const word of goalNameWords) {
      if (word.length > 2 && description.includes(word)) {
        matchedKeywords.push(`goal-name:${word}`);
        score += 8; // 8 points per goal name word match
      }
    }

    // Check goal description words  
    for (const word of goalDescriptionWords) {
      if (word.length > 3 && description.includes(word)) {
        matchedKeywords.push(`goal-desc:${word}`);
        score += 5; // 5 points per goal description word match
      }
    }

    // Cap at 30 points maximum
    score = Math.min(score, 30);

    if (matchedKeywords.length > 0) {
      factors.push(`Keyword matches: ${matchedKeywords.join(', ')}`);
    }

    return score;
  }

  private calculateTransactionContextScore(
    transaction: TransactionContext,
    goal: any,
    factors: string[]
  ): number {
    let score = 0;

    // Transaction type relevance
    const typeRelevance = this.getTransactionTypeRelevance(transaction.type, goal.type);
    score += typeRelevance.score;
    
    if (typeRelevance.score > 0) {
      factors.push(`Transaction type relevance: ${typeRelevance.reason}`);
    }

    // Amount appropriateness (0-5 points)
    const amount = parseFloat(transaction.amount);
    const targetAmount = parseFloat(goal.targetAmount || '0');
    const currentAmount = parseFloat(goal.currentAmount || '0');
    
    if (targetAmount > 0) {
      const remainingAmount = targetAmount - currentAmount;
      const amountRatio = amount / remainingAmount;
      
      if (amountRatio >= 0.01 && amountRatio <= 1.0) { // Between 1% and 100% of remaining amount
        const amountScore = Math.min(5, Math.floor(amountRatio * 10));
        score += amountScore;
        factors.push(`Amount appropriateness: ${(amountRatio * 100).toFixed(1)}% of remaining goal`);
      }
    }

    return Math.min(score, 20); // Cap at 20 points
  }

  private async calculateAISemanticScore(
    transaction: TransactionContext,
    goal: any,
    factors: string[]
  ): Promise<number> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return 0; // Skip AI analysis if no API key
      }

      const prompt = `
Analyze if this financial transaction is semantically related to this goal:

TRANSACTION:
- Description: "${transaction.description}"
- Amount: ${transaction.amount} IDR
- Type: ${transaction.type}

GOAL: 
- Name: "${goal.name}"
- Type: ${goal.type}
- Description: "${goal.description || 'No description'}"

Rate semantic relevance from 0-10:
- 0-2: Not related at all
- 3-4: Slightly related
- 5-6: Moderately related  
- 7-8: Highly related
- 9-10: Perfect match

Respond with only a JSON object: {"score": number, "reasoning": "brief explanation"}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a financial analysis AI. Analyze semantic relationships between transactions and financial goals. Respond only with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return 0;

      const result = JSON.parse(response);
      const score = Math.min(Math.max(result.score || 0, 0), 10);
      
      if (score > 0) {
        factors.push(`AI semantic match: ${score}/10 - ${result.reasoning}`);
      }

      return score;
    } catch (error) {
      console.error('AI semantic scoring failed:', error);
      return 0;
    }
  }

  private getTransactionTypeRelevance(transactionType: string, goalType: string): { score: number; reason: string } {
    const relevanceMatrix: Record<string, Record<string, { score: number; reason: string }>> = {
      'saving': {
        'savings': { score: 15, reason: 'Perfect match - saving transaction for savings goal' },
        'emergency_fund': { score: 15, reason: 'Perfect match - saving for emergency fund' },
        'vacation': { score: 12, reason: 'Good match - saving for vacation' },
        'house': { score: 12, reason: 'Good match - saving for house' },
        'education': { score: 12, reason: 'Good match - saving for education' },
        'retirement': { score: 10, reason: 'Good match - saving for retirement' },
        'investment': { score: 8, reason: 'Moderate match - saving for investment' },
        'debt_payment': { score: 5, reason: 'Low match - saving could be for debt payment' }
      },
      'expense': {
        'vacation': { score: 10, reason: 'Good match - vacation expense' },
        'education': { score: 10, reason: 'Good match - education expense' },
        'house': { score: 8, reason: 'Moderate match - house-related expense' },
        'debt_payment': { score: 5, reason: 'Low match - expense could be debt payment' },
        'emergency_fund': { score: 3, reason: 'Low match - emergency fund usage' }
      },
      'transfer': {
        'savings': { score: 8, reason: 'Moderate match - transfer for savings' },
        'investment': { score: 10, reason: 'Good match - transfer for investment' },
        'debt_payment': { score: 8, reason: 'Moderate match - transfer for debt payment' }
      },
      'debt_payment': {
        'debt_payment': { score: 15, reason: 'Perfect match - debt payment transaction' }
      },
      'repayment': {
        'debt_payment': { score: 15, reason: 'Perfect match - repayment transaction' }
      }
    };

    return relevanceMatrix[transactionType]?.[goalType] || { score: 0, reason: 'No relevance found' };
  }

  private calculateConfidence(account: number, keyword: number, context: number, ai: number): number {
    const total = account + keyword + context + ai;
    
    // High confidence factors
    let confidenceBoosts = 0;
    if (account >= 40) confidenceBoosts += 0.3; // Strong account link
    if (keyword >= 20) confidenceBoosts += 0.2; // Strong keyword match  
    if (ai >= 7) confidenceBoosts += 0.2; // Strong AI match
    if (context >= 10) confidenceBoosts += 0.1; // Good context match

    // Base confidence from total score
    const baseConfidence = Math.min(total / 100, 0.8);
    
    return Math.min(baseConfidence + confidenceBoosts, 1.0);
  }

  private buildReasoningText(goal: any, factors: string[], score: number): string {
    const factorText = factors.length > 0 ? factors.join('; ') : 'No clear matching factors';
    return `Goal "${goal.name}" scored ${score} points. Factors: ${factorText}`;
  }

  private resolveTie(tiedGoals: GoalMatchScore[], transaction: TransactionContext): GoalMatchScore {
    // Tiebreaker 1: Prefer account-linked goals
    const accountLinkedGoals = tiedGoals.filter(goal => goal.criteria.accountLinking > 0);
    if (accountLinkedGoals.length === 1) {
      return accountLinkedGoals[0];
    }

    // Tiebreaker 2: Prefer higher AI semantic score
    const highestAI = Math.max(...tiedGoals.map(g => g.criteria.aiSemanticMatch));
    const aiWinners = tiedGoals.filter(g => g.criteria.aiSemanticMatch === highestAI);
    if (aiWinners.length === 1) {
      return aiWinners[0];
    }

    // Tiebreaker 3: Prefer higher keyword relevance
    const highestKeyword = Math.max(...tiedGoals.map(g => g.criteria.keywordRelevance));
    const keywordWinners = tiedGoals.filter(g => g.criteria.keywordRelevance === highestKeyword);
    if (keywordWinners.length === 1) {
      return keywordWinners[0];
    }

    // Tiebreaker 4: Prefer specific goal types over generic ones
    const goalTypePriority: Record<string, number> = {
      'debt_payment': 10,
      'emergency_fund': 9,
      'house': 8,
      'vacation': 7,
      'education': 6,
      'investment': 5,
      'retirement': 4,
      'savings': 3 // Generic savings goal has lowest priority
    };

    tiedGoals.sort((a, b) => (goalTypePriority[b.goalType] || 0) - (goalTypePriority[a.goalType] || 0));
    
    return tiedGoals[0]; // Return highest priority goal type
  }

  private getGoalKeywords(goalType: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'emergency_fund': ['emergency', 'urgent', 'backup', 'reserve', 'safety', 'fund'],
      'vacation': ['vacation', 'holiday', 'travel', 'trip', 'flight', 'hotel', 'tour', 'bali', 'liburan'],
      'house': ['house', 'home', 'property', 'mortgage', 'down payment', 'real estate', 'rumah'],
      'debt_payment': ['debt', 'payment', 'loan', 'credit', 'installment', 'payoff'],
      'investment': ['invest', 'portfolio', 'stock', 'bond', 'mutual fund', 'trading'],
      'education': ['education', 'school', 'course', 'training', 'certification', 'tuition'],
      'retirement': ['retirement', 'pension', 'ira', '401k', 'senior', 'elderly'],
      'savings': ['saving', 'save', 'deposit', 'accumulate', 'reserve', 'tabungan']
    };

    return keywordMap[goalType] || [];
  }
}

export const smartGoalMatcher = new SmartGoalMatcherService();