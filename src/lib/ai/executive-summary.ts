/**
 * AI-powered weekly executive summary generation
 * Analyzes last 6 months of financial data, generates 5 key bullet points
 * Updated for AI SDK v6
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateText, Output } from "ai"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { z } from "zod"
import { logInfo, logError } from "@/lib/utils/logger"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

// Schema for AI response - simple 5 bullet points
const ExecutiveSummarySchema = z.object({
  bullets: z.array(z.string()).length(5).describe("Exactly 5 bullet points of key financial insights"),
})

export type ExecutiveSummaryResult = z.infer<typeof ExecutiveSummarySchema>

// Simplified data structure for LLM
interface FinancialData {
  periodMonths: number
  totalSpending: number
  totalIncome: number
  savingsRate: number
  avgMonthlySpending: number
  avgMonthlyIncome: number
  spendingByCategory: { name: string; amount: number; percent: number }[]
  topMerchants: { name: string; amount: number; visits: number }[]
  monthlyTrend: { month: string; spending: number; income: number }[]
  recentVsAverage: { lastMonthSpending: number; avgSpending: number; percentDiff: number }
}

// Raw transaction for LLM context
interface RawTransaction {
  date: string
  merchant: string
  amount: number
  category: string | null
  groupType: string | null
}

/**
 * Aggregate last 6 months of financial data using Convex
 */
async function aggregateFinancialData(): Promise<
  FinancialData & { rawTransactions: RawTransaction[]; categoriesContext: string }
> {
  const data = await fetchQuery(api.weeklySummary.aggregateFinancialData, {})
  return data
}

/**
 * Format raw transactions for LLM context (compact format)
 */
function formatTransactionsForLLM(transactions: RawTransaction[]): string {
  // Format: date | merchant | $amount | category [TYPE]
  return transactions
    .map((t) => {
      const amt = t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(0)}` : `+$${t.amount.toFixed(0)}`
      const type = t.groupType ? ` [${t.groupType}]` : ""
      return `${t.date} | ${t.merchant} | ${amt} | ${t.category || "Uncategorized"}${type}`
    })
    .join("\n")
}

/**
 * Generate 5 bullet point summary using OpenAI
 */
async function generateExecutiveSummary(
  data: FinancialData & { rawTransactions: RawTransaction[]; categoriesContext: string },
): Promise<string> {
  const transactionsContext = formatTransactionsForLLM(data.rawTransactions)

  const prompt = `Analyze this 6-month financial data and provide exactly 5 bullet points. Each bullet should be a single, actionable insight.

DATA (Last ${data.periodMonths} months):
- Total Spent: $${data.totalSpending.toFixed(0)} | Total Income: $${data.totalIncome.toFixed(0)}
- Savings Rate: ${data.savingsRate.toFixed(1)}%
- Avg Monthly: $${data.avgMonthlySpending.toFixed(0)} spent, $${data.avgMonthlyIncome.toFixed(0)} earned
- Last Month: $${data.recentVsAverage.lastMonthSpending.toFixed(0)} (${data.recentVsAverage.percentDiff > 0 ? "+" : ""}${data.recentVsAverage.percentDiff.toFixed(0)}% vs avg)

TOP CATEGORIES:
${data.spendingByCategory
  .slice(0, 5)
  .map((c) => `${c.name}: $${c.amount.toFixed(0)} (${c.percent.toFixed(0)}%)`)
  .join(" | ")}

TOP MERCHANTS:
${data.topMerchants
  .slice(0, 5)
  .map((m) => `${m.name}: $${m.amount.toFixed(0)} (${m.visits}x)`)
  .join(" | ")}

MONTHLY TREND:
${data.monthlyTrend.map((m) => `${m.month}: $${m.spending.toFixed(0)}`).join(" → ")}

RULES:
- Each bullet max 40 words
- Be specific with $ amounts
- Focus on actionable insights (what to do, not just observations)
- Include: 1 savings insight, 1 spending trend, 1 category to watch, 1 merchant insight, 1 recommendation
- No generic advice - use the actual numbers

IMPORTANT - CATEGORY TYPES:
- Categories marked [INVESTMENT] (RRSP, TFSA, savings accounts, etc.) are POSITIVE financial moves, even though they show as negative amounts (money leaving checking account). Treat these as savings/investments, NOT expenses.
- Categories marked [INCOME] are income sources
- Categories marked [EXPENSES] are actual spending

---

AVAILABLE CATEGORIES (with [TYPE]):
${data.categoriesContext}

RAW TRANSACTIONS (${data.rawTransactions.length} transactions, format: date | merchant | amount | category [TYPE]):
${transactionsContext}`

  logInfo("Generating executive summary", {
    months: data.periodMonths,
    totalSpending: data.totalSpending,
  })

  const result = await generateText({
    model: openai("gpt-5-mini"),
    output: Output.object({ schema: ExecutiveSummarySchema }),
    prompt,
  })

  // Join bullets with newlines, prefixed with bullet character
  const summary = result.output!.bullets.map((b: string) => `• ${b}`).join("\n")

  logInfo("Executive summary generated")

  return summary
}

/**
 * Main entry point: aggregate data + generate summary + store
 */
export async function generateAndStoreWeeklySummary(): Promise<{ id: string } | null> {
  try {
    const data = await aggregateFinancialData()

    if (data.totalSpending === 0 && data.totalIncome === 0) {
      logInfo("No transactions found, skipping summary")
      return null
    }

    const summary = await generateExecutiveSummary(data)

    const id = await fetchMutation(api.weeklySummary.create, { summary })

    logInfo("Weekly summary created", { id })
    return { id }
  } catch (error) {
    logError("Failed to generate weekly summary", error)
    throw error
  }
}
