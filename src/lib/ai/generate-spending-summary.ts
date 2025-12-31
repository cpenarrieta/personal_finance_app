/**
 * AI-powered spending summary generation using OpenAI via ai-sdk
 * Generates 5 facts and 2 saving opportunities based on Dave Ramsey's philosophy
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { logInfo, logError } from "@/lib/utils/logger"

// Initialize OpenAI with API key
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for spending summary response
const SpendingSummarySchema = z.object({
  facts: z
    .array(
      z.object({
        title: z.string().max(50).describe("Short title for the fact"),
        description: z.string().max(200).describe("Detailed description of the spending fact"),
        type: z
          .enum(["neutral", "positive", "warning"])
          .describe("Type of fact: neutral for info, positive for good news, warning for concerns"),
      }),
    )
    .length(5)
    .describe("Exactly 5 interesting facts about spending patterns"),
  savingOpportunities: z
    .array(
      z.object({
        title: z.string().max(50).describe("Short title for the saving opportunity"),
        description: z
          .string()
          .max(300)
          .describe("Actionable advice based on Dave Ramsey's principles"),
        potentialSavings: z
          .string()
          .max(50)
          .describe("Estimated potential savings amount or percentage"),
        priority: z.enum(["high", "medium", "low"]).describe("Priority level for this opportunity"),
      }),
    )
    .length(2)
    .describe("Exactly 2 saving opportunities based on Dave Ramsey's baby steps and philosophy"),
})

export type SpendingSummary = z.infer<typeof SpendingSummarySchema>

// Types for input data
interface CategorySpending {
  categoryId: string | null
  categoryName: string
  groupType: string
  subcategoryId: string | null
  subcategoryName: string | null
  totalSpending: number
  transactionCount: number
}

interface SuperCategorySpending {
  groupType: string
  totalSpending: number
  transactionCount: number
}

interface TopExpense {
  id: string
  amount: number
  date: string
  merchant: string
  name: string
  categoryName: string
  subcategoryName: string | null
  groupType: string | null
}

interface SpendingSummaryInput {
  byCategory: CategorySpending[]
  bySuperCategory: SuperCategorySpending[]
  topExpenses: TopExpense[]
  dateRange: { start: string; end: string }
  totalSpending: number
  totalIncome: number
}

/**
 * Generate a spending summary with 5 facts and 2 saving opportunities
 * Uses Dave Ramsey's baby steps and saving philosophy for recommendations
 */
export async function generateSpendingSummary(
  input: SpendingSummaryInput,
): Promise<SpendingSummary | null> {
  try {
    // Build context for the AI
    const categorySpendingContext = input.byCategory
      .slice(0, 20) // Top 20 categories
      .map(
        (c) =>
          `- ${c.categoryName}${c.subcategoryName ? ` > ${c.subcategoryName}` : ""}: $${c.totalSpending.toFixed(2)} (${c.transactionCount} transactions)`,
      )
      .join("\n")

    const superCategoryContext = input.bySuperCategory
      .map((s) => `- ${s.groupType}: $${s.totalSpending.toFixed(2)} (${s.transactionCount} transactions)`)
      .join("\n")

    const topExpensesContext = input.topExpenses
      .slice(0, 30) // Top 30 for context
      .map(
        (t, i) =>
          `${i + 1}. $${t.amount.toFixed(2)} at ${t.merchant} (${t.categoryName}) - ${t.date.split("T")[0]}`,
      )
      .join("\n")

    const netCashflow = input.totalIncome - input.totalSpending
    const savingsRate = input.totalIncome > 0 ? ((input.totalIncome - input.totalSpending) / input.totalIncome) * 100 : 0

    const prompt = `You are a personal finance advisor analyzing spending data. Generate insights based on Dave Ramsey's financial philosophy.

PERIOD: ${input.dateRange.start} to ${input.dateRange.end}

FINANCIAL OVERVIEW:
- Total Spending: $${input.totalSpending.toFixed(2)}
- Total Income: $${input.totalIncome.toFixed(2)}
- Net Cashflow: $${netCashflow.toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%

SPENDING BY SUPER CATEGORY:
${superCategoryContext}

SPENDING BY CATEGORY (Top 20):
${categorySpendingContext}

TOP EXPENSES (Most expensive transactions):
${topExpensesContext}

DAVE RAMSEY'S BABY STEPS (for context):
1. Save $1,000 emergency fund
2. Pay off all debt (except mortgage) using debt snowball
3. Save 3-6 months of expenses in emergency fund
4. Invest 15% of income in retirement
5. Save for children's college fund
6. Pay off home early
7. Build wealth and give generously

DAVE RAMSEY'S KEY PRINCIPLES:
- Live on less than you make
- Avoid lifestyle inflation
- Every dollar should have a purpose (zero-based budget)
- Needs vs wants: Cut unnecessary expenses
- Cash envelope system for variable expenses
- No credit cards - use debit/cash only
- Pay yourself first (savings before spending)
- Attack highest spending categories first
- Cancel unused subscriptions
- Meal prep to reduce dining out

INSTRUCTIONS:
1. Generate EXACTLY 5 interesting facts about the spending patterns
   - Make them specific and data-driven (use actual numbers from the data)
   - Include comparisons, percentages, and insights
   - Mix positive, neutral, and warning facts based on actual spending behavior
   - Facts should be actionable and insightful

2. Generate EXACTLY 2 saving opportunities based on Dave Ramsey's philosophy
   - Be specific about which category or spending pattern to address
   - Provide actionable, practical advice
   - Estimate realistic potential savings based on the actual data
   - Reference Dave Ramsey's principles where relevant
   - Focus on the highest-impact opportunities from the data

Be direct and specific. Use the actual dollar amounts from the data. Don't be generic.`

    const result = await generateObject({
      model: openai("gpt-5-mini"),
      schema: SpendingSummarySchema,
      prompt,
    })

    logInfo("🤖 Generated spending summary", {
      factsCount: result.object.facts.length,
      opportunitiesCount: result.object.savingOpportunities.length,
      dateRange: input.dateRange,
    })

    return result.object
  } catch (error) {
    logError("Error generating spending summary:", error, {
      dateRange: input.dateRange,
    })
    return null
  }
}
