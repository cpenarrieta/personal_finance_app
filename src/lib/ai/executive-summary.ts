/**
 * AI-powered weekly executive summary generation
 * Analyzes last 6 months of financial data, generates 5 key bullet points
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { logInfo, logError } from "@/lib/utils/logger"
import { format, subMonths } from "date-fns"

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
 * Fetch raw transactions from last 6 months for LLM context
 */
async function getRawTransactions(sixMonthsAgo: string): Promise<RawTransaction[]> {
  const transactions = await prisma.$queryRaw<
    Array<{
      datetime: string
      merchant: string | null
      name: string
      amount: number
      category: string | null
      group_type: string | null
    }>
  >`
    SELECT
      t.datetime,
      t."merchantName" as merchant,
      t.name,
      t.amount_number as amount,
      c.name as category,
      c."groupType" as group_type
    FROM "Transaction" t
    LEFT JOIN "Category" c ON t."categoryId" = c.id
    WHERE CAST(t.datetime AS date) >= CAST(${sixMonthsAgo} AS date)
      AND t."isSplit" = false
      AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
    ORDER BY t.datetime DESC
  `

  return transactions.map((t) => ({
    date: t.datetime?.split("T")[0] || "",
    merchant: t.merchant || t.name,
    amount: Number(t.amount || 0),
    category: t.category,
    groupType: t.group_type,
  }))
}

/**
 * Fetch all categories with subcategories and groupType
 */
async function getAllCategories(): Promise<string> {
  const categories = await prisma.category.findMany({
    where: { isTransferCategory: false },
    include: { subcategories: true },
    orderBy: { displayOrder: "asc" },
  })

  return categories
    .map((c) => {
      const subs = c.subcategories.map((s) => s.name).join(", ")
      const type = c.groupType ? `[${c.groupType}]` : ""
      return `${c.name} ${type}${subs ? `: ${subs}` : ""}`
    })
    .join("\n")
}

/**
 * Aggregate last 6 months of financial data
 */
export async function aggregateFinancialData(): Promise<
  FinancialData & { rawTransactions: RawTransaction[]; categoriesContext: string }
> {
  const now = new Date()
  const sixMonthsAgo = format(subMonths(now, 6), "yyyy-MM-dd")

  const [totals, spendingByCategory, topMerchants, monthlyBreakdown, rawTransactions, categoriesContext] =
    await Promise.all([
      // 6-month totals
      prisma.$queryRaw<Array<{ total_spending: number | null; total_income: number | null }>>`
      SELECT
        CAST(SUM(CASE WHEN t.amount_number < 0 THEN ABS(t.amount_number) ELSE 0 END) AS double precision) as total_spending,
        CAST(SUM(CASE WHEN t.amount_number > 0 THEN t.amount_number ELSE 0 END) AS double precision) as total_income
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE CAST(t.datetime AS date) >= CAST(${sixMonthsAgo} AS date)
        AND t."isSplit" = false
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
    `,

      // Spending by category
      prisma.$queryRaw<Array<{ name: string | null; amount: number | null }>>`
      SELECT
        COALESCE(c.name, 'Uncategorized') as name,
        CAST(SUM(ABS(t.amount_number)) AS double precision) as amount
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE CAST(t.datetime AS date) >= CAST(${sixMonthsAgo} AS date)
        AND t."isSplit" = false
        AND t.amount_number < 0
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
      GROUP BY c.name
      ORDER BY amount DESC
      LIMIT 10
    `,

      // Top merchants
      prisma.$queryRaw<Array<{ name: string | null; amount: number | null; visits: bigint }>>`
      SELECT
        COALESCE(t."merchantName", t.name) as name,
        CAST(SUM(ABS(t.amount_number)) AS double precision) as amount,
        COUNT(*) as visits
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE CAST(t.datetime AS date) >= CAST(${sixMonthsAgo} AS date)
        AND t."isSplit" = false
        AND t.amount_number < 0
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
      GROUP BY COALESCE(t."merchantName", t.name)
      ORDER BY amount DESC
      LIMIT 10
    `,

      // Monthly breakdown
      prisma.$queryRaw<Array<{ month: string; spending: number | null; income: number | null }>>`
      SELECT
        to_char(CAST(t.datetime AS date), 'YYYY-MM') as month,
        CAST(SUM(CASE WHEN t.amount_number < 0 THEN ABS(t.amount_number) ELSE 0 END) AS double precision) as spending,
        CAST(SUM(CASE WHEN t.amount_number > 0 THEN t.amount_number ELSE 0 END) AS double precision) as income
      FROM "Transaction" t
      LEFT JOIN "Category" c ON t."categoryId" = c.id
      WHERE CAST(t.datetime AS date) >= CAST(${sixMonthsAgo} AS date)
        AND t."isSplit" = false
        AND (c."isTransferCategory" = false OR c."isTransferCategory" IS NULL)
      GROUP BY to_char(CAST(t.datetime AS date), 'YYYY-MM')
      ORDER BY month DESC
    `,

      // Raw transactions for LLM context
      getRawTransactions(sixMonthsAgo),

      // Categories context
      getAllCategories(),
    ])

  const totalSpending = Number(totals[0]?.total_spending || 0)
  const totalIncome = Number(totals[0]?.total_income || 0)
  const monthCount = monthlyBreakdown.length || 1

  const avgMonthlySpending = totalSpending / monthCount
  const avgMonthlyIncome = totalIncome / monthCount
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0

  const categories = spendingByCategory.map((c) => ({
    name: c.name || "Uncategorized",
    amount: Number(c.amount || 0),
    percent: totalSpending > 0 ? (Number(c.amount || 0) / totalSpending) * 100 : 0,
  }))

  const merchants = topMerchants.map((m) => ({
    name: m.name || "Unknown",
    amount: Number(m.amount || 0),
    visits: Number(m.visits || 0),
  }))

  const monthly = monthlyBreakdown.map((m) => ({
    month: m.month,
    spending: Number(m.spending || 0),
    income: Number(m.income || 0),
  }))

  // Last month vs average
  const lastMonthSpending = monthly[0]?.spending || 0
  const percentDiff = avgMonthlySpending > 0 ? ((lastMonthSpending - avgMonthlySpending) / avgMonthlySpending) * 100 : 0

  return {
    periodMonths: monthCount,
    totalSpending,
    totalIncome,
    savingsRate,
    avgMonthlySpending,
    avgMonthlyIncome,
    spendingByCategory: categories,
    topMerchants: merchants,
    monthlyTrend: monthly,
    recentVsAverage: { lastMonthSpending, avgSpending: avgMonthlySpending, percentDiff },
    rawTransactions,
    categoriesContext,
  }
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
export async function generateExecutiveSummary(
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

  console.log("Prompt:", prompt)

  const result = await generateObject({
    model: openai("gpt-5.2-2025-12-11"),
    schema: ExecutiveSummarySchema,
    prompt,
  })

  // Join bullets with newlines, prefixed with bullet character
  const summary = result.object.bullets.map((b) => `• ${b}`).join("\n")

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

    const record = await prisma.weeklySummary.create({
      data: { summary },
    })

    logInfo("Weekly summary created", { id: record.id })
    return { id: record.id }
  } catch (error) {
    logError("Failed to generate weekly summary", error)
    throw error
  }
}
