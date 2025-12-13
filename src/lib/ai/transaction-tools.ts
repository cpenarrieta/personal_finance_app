/**
 * AI Tools for querying transaction data
 * These tools wrap existing cached queries to provide transaction insights
 *
 * IMPORTANT: Spending/income calculations exclude transfer categories to match dashboard behavior.
 * Transfer categories represent money movement between accounts (not true income/expense).
 * This ensures consistent totals across AI chat and dashboard displays.
 */

import { tool } from "ai"
import { z } from "zod"
import { getAllTransactions } from "@/lib/db/queries"
import { getTransactionDate, isTransactionInDateRange, getTransactionMonth } from "@/lib/utils/transaction-date"
import { logInfo, logError } from "@/lib/utils/logger"

// Type for a single transaction from getAllTransactions
type Transaction = Awaited<ReturnType<typeof getAllTransactions>>[number]

/**
 * Get transactions within a date range with optional filters
 */
export const getTransactionsByDateRange = tool({
  description:
    "Get bank transactions within a specific date range. Optionally filter by category name or merchant. Use this to answer questions like 'How much did I spend last month?' or 'Show me food transactions in January'.",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format (e.g., 2024-01-01)"),
    endDate: z.string().describe("End date in YYYY-MM-DD format (e.g., 2024-01-31)"),
    categoryName: z.string().optional().describe("Filter by category name (e.g., 'Food & Drink', 'Shopping')"),
    merchantName: z.string().optional().describe("Filter by merchant name (e.g., 'Starbucks', 'Amazon')"),
  }),
  execute: async ({
    startDate,
    endDate,
    categoryName,
    merchantName,
  }: {
    startDate: string
    endDate: string
    categoryName?: string
    merchantName?: string
  }) => {
    const transactions = await getAllTransactions()

    const filtered = transactions.filter((t: Transaction) => {
      const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
      const matchesCategory = !categoryName || t.category?.name.toLowerCase().includes(categoryName.toLowerCase())
      const matchesMerchant =
        !merchantName || (t.merchantName && t.merchantName.toLowerCase().includes(merchantName.toLowerCase()))
      // Note: Include transfers for transaction listing (user may want to see them)
      // For calculations (spending/income), transfers are excluded in other tools

      return isInRange && matchesCategory && matchesMerchant
    })

    // Return simplified data for the AI
    return filtered.map((t: Transaction) => ({
      date: getTransactionDate(t.datetime),
      name: t.name,
      merchant: t.merchantName,
      amount: t.amount_number,
      category: t.category?.name,
      subcategory: t.subcategory?.name,
      account: t.account?.name,
      pending: t.pending,
    }))
  },
})

/**
 * Get spending grouped by category for a date range
 */
export const getSpendingByCategory = tool({
  description:
    "Get total spending grouped by category for a date range. Returns aggregated spending data. Use this to answer questions like 'What are my top spending categories?' or 'How much did I spend on food vs shopping?'",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    limit: z.number().optional().default(10).describe("Number of top categories to return (default: 10)"),
    sortBy: z
      .enum(["amount", "count"])
      .optional()
      .default("amount")
      .describe("Sort by total amount or transaction count"),
  }),
  execute: async ({
    startDate,
    endDate,
    limit = 10,
    sortBy = "amount",
  }: {
    startDate: string
    endDate: string
    limit?: number
    sortBy?: "amount" | "count"
  }) => {
    logInfo("\n🔧 [getSpendingByCategory] EXECUTING", { startDate, endDate, limit, sortBy })

    try {
      const transactions = await getAllTransactions()
      logInfo("  Fetched transactions", { count: transactions.length })

      // Filter by date range and exclude transfer categories
      const filtered = transactions.filter((t: Transaction) => {
        const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
        const isNotTransfer = !t.category?.isTransferCategory
        return isInRange && isNotTransfer
      })

      // Group by category
      const categoryMap = new Map<string, { name: string; total: number; count: number; transactions: number[] }>()

      filtered.forEach((t: Transaction) => {
        const categoryName = t.category?.name || "Uncategorized"
        const existing = categoryMap.get(categoryName)

        if (existing) {
          existing.total += t.amount_number
          existing.count += 1
          existing.transactions.push(t.amount_number)
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            total: t.amount_number,
            count: 1,
            transactions: [t.amount_number],
          })
        }
      })

      // Convert to array and sort
      const categoryData = Array.from(categoryMap.values())
      categoryData.sort((a, b) => {
        if (sortBy === "amount") {
          return b.total - a.total
        }
        return b.count - a.count
      })

      // Return top N categories
      const result = categoryData.slice(0, limit).map((c) => ({
        category: c.name,
        totalSpent: Number(c.total.toFixed(2)),
        transactionCount: c.count,
        averageTransaction: Number((c.total / c.count).toFixed(2)),
      }))

      logInfo("  Returning result", { categoryCount: result.length })
      return result
    } catch (error) {
      logError("  ❌ ERROR in getSpendingByCategory:", error)
      throw error
    }
  },
})

/**
 * Get spending grouped by merchant
 */
export const getSpendingByMerchant = tool({
  description:
    "Get total spending grouped by merchant for a date range. Use this to answer questions like 'Where do I spend the most money?' or 'How much have I spent at Starbucks?'",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    limit: z.number().optional().default(10).describe("Number of top merchants to return (default: 10)"),
  }),
  execute: async ({ startDate, endDate, limit = 10 }: { startDate: string; endDate: string; limit?: number }) => {
    const transactions = await getAllTransactions()

    // Filter by date range, merchants only, and exclude transfer categories
    const filtered = transactions.filter((t: Transaction) => {
      const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
      const hasMerchant = !!t.merchantName
      const isNotTransfer = !t.category?.isTransferCategory
      return isInRange && hasMerchant && isNotTransfer
    })

    // Group by merchant
    const merchantMap = new Map<string, { name: string; total: number; count: number }>()

    filtered.forEach((t: Transaction) => {
      const merchantName = t.merchantName!
      const existing = merchantMap.get(merchantName)

      if (existing) {
        existing.total += t.amount_number
        existing.count += 1
      } else {
        merchantMap.set(merchantName, {
          name: merchantName,
          total: t.amount_number,
          count: 1,
        })
      }
    })

    // Convert to array and sort by total
    const merchantData = Array.from(merchantMap.values())
    merchantData.sort((a, b) => b.total - a.total)

    // Return top N merchants
    return merchantData.slice(0, limit).map((m) => ({
      merchant: m.name,
      totalSpent: Number(m.total.toFixed(2)),
      transactionCount: m.count,
      averageTransaction: Number((m.total / m.count).toFixed(2)),
    }))
  },
})

/**
 * Get total spending for a date range
 */
export const getTotalSpending = tool({
  description:
    "Get total spending, income, and net for a date range. Use this to answer questions like 'How much did I spend last month?' or 'What's my net income for the year?'",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
  }),
  execute: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    logInfo("\n💰 [getTotalSpending] EXECUTING", { startDate, endDate })

    try {
      const transactions = await getAllTransactions()
      logInfo("  Fetched transactions", { count: transactions.length })

      // Filter by date range and exclude transfer categories
      const filtered = transactions.filter((t: Transaction) => {
        const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
        const isNotTransfer = !t.category?.isTransferCategory
        return isInRange && isNotTransfer
      })

      // Calculate totals (negative = expense, positive = income)
      let totalExpenses = 0
      let totalIncome = 0

      filtered.forEach((t: Transaction) => {
        if (t.amount_number < 0) {
          totalExpenses += Math.abs(t.amount_number)
        } else {
          totalIncome += t.amount_number
        }
      })

      const result = {
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalIncome: Number(totalIncome.toFixed(2)),
        netAmount: Number((totalIncome - totalExpenses).toFixed(2)),
        transactionCount: filtered.length,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      }

      logInfo("  Returning result", { result })
      return result
    } catch (error) {
      logError("  ❌ ERROR in getTotalSpending:", error)
      throw error
    }
  },
})

/**
 * Get spending trends over time (monthly breakdown)
 */
export const getSpendingTrends = tool({
  description:
    "Get spending trends broken down by month. Use this to answer questions like 'Show me my spending trend over the last 6 months' or 'How does my spending vary by month?'",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    categoryName: z
      .string()
      .optional()
      .describe("Optional: filter by category name to see trends for a specific category"),
  }),
  execute: async ({
    startDate,
    endDate,
    categoryName,
  }: {
    startDate: string
    endDate: string
    categoryName?: string
  }) => {
    const transactions = await getAllTransactions()

    // Filter by date range, optional category, and exclude transfer categories
    const filtered = transactions.filter((t: Transaction) => {
      const isInRange = isTransactionInDateRange(t.datetime, startDate, endDate)
      const matchesCategory = !categoryName || t.category?.name.toLowerCase().includes(categoryName.toLowerCase())
      const isNotTransfer = !t.category?.isTransferCategory
      return isInRange && matchesCategory && isNotTransfer
    })

    // Group by month
    const monthMap = new Map<string, { expenses: number; income: number; count: number }>()

    filtered.forEach((t: Transaction) => {
      const monthKey = getTransactionMonth(t.datetime)

      const existing = monthMap.get(monthKey)
      const isExpense = t.amount_number < 0
      const amount = Math.abs(t.amount_number)

      if (existing) {
        if (isExpense) {
          existing.expenses += amount
        } else {
          existing.income += amount
        }
        existing.count += 1
      } else {
        monthMap.set(monthKey, {
          expenses: isExpense ? amount : 0,
          income: isExpense ? 0 : amount,
          count: 1,
        })
      }
    })

    // Convert to array and sort by month
    const monthData = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        totalExpenses: Number(data.expenses.toFixed(2)),
        totalIncome: Number(data.income.toFixed(2)),
        netAmount: Number((data.income - data.expenses).toFixed(2)),
        transactionCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return monthData
  },
})

/**
 * Render a chart visualization
 */
export const renderChart = tool({
  description:
    "Render a chart to visualize data. Use this when the user asks for a chart or when data would be better understood visually. Supports bar, line, pie, and area charts.",
  inputSchema: z.object({
    type: z.enum(["bar", "line", "pie", "area"]).describe("The type of chart to render"),
    title: z.string().describe("Chart title"),
    description: z.string().optional().describe("Brief description of what the chart shows"),
    data: z
      .array(
        z.object({
          label: z.string().describe("Label for this data point (e.g., category name, month)"),
          value: z.number().describe("Numeric value"),
          color: z.string().optional().describe("Optional hex color for this data point"),
        }),
      )
      .describe("Array of data points to visualize"),
    xAxisLabel: z.string().optional().describe("Label for X axis (for bar/line/area charts)"),
    yAxisLabel: z.string().optional().describe("Label for Y axis (for bar/line/area charts)"),
    formatValue: z
      .enum(["currency", "number", "percentage"])
      .optional()
      .default("currency")
      .describe("How to format values in the chart"),
  }),
  execute: async ({
    type,
    title,
    description,
    data,
    xAxisLabel,
    yAxisLabel,
    formatValue = "currency",
  }: {
    type: "bar" | "line" | "pie" | "area"
    title: string
    description?: string
    data: Array<{ label: string; value: number; color?: string }>
    xAxisLabel?: string
    yAxisLabel?: string
    formatValue?: "currency" | "number" | "percentage"
  }) => {
    logInfo("\n📊 [renderChart] EXECUTING", { type, title, dataPointCount: data.length })

    // Return the chart configuration for the frontend to render
    const result = {
      type,
      title,
      description,
      data,
      xAxisLabel,
      yAxisLabel,
      formatValue,
    }

    logInfo("  Returning chart config", { chartConfig: result })
    return result
  },
})

/**
 * Get a comprehensive financial snapshot for Ramsey Baby Steps analysis
 * This tool prepares condensed financial data to help analyze which Baby Step the user is on
 */
export const getRamseyFinancialSnapshot = tool({
  description:
    "Get a comprehensive financial snapshot for Dave Ramsey Baby Steps analysis. This provides income, expenses, savings rate, and spending patterns needed to determine which Baby Step the user is on and provide personalized financial advice.",
  inputSchema: z.object({
    monthsToAnalyze: z
      .number()
      .optional()
      .default(6)
      .describe("Number of months to analyze for financial patterns (default: 6)"),
  }),
  execute: async ({ monthsToAnalyze = 6 }: { monthsToAnalyze?: number }) => {
    logInfo("\n📊 [getRamseyFinancialSnapshot] EXECUTING", { monthsToAnalyze })

    try {
      const transactions = await getAllTransactions()
      const today = new Date()

      // Calculate date range for analysis
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // End of current month
      const startDate = new Date(today.getFullYear(), today.getMonth() - monthsToAnalyze + 1, 1) // Start of analysis period

      const startDateStr = startDate.toISOString().split("T")[0]
      const endDateStr = endDate.toISOString().split("T")[0]

      // Filter transactions: exclude transfers, within date range
      const filtered = transactions.filter((t: Transaction) => {
        const isInRange = isTransactionInDateRange(t.datetime, startDateStr, endDateStr)
        const isNotTransfer = !t.category?.isTransferCategory
        return isInRange && isNotTransfer
      })

      // Calculate monthly breakdown
      const monthlyData = new Map<
        string,
        {
          income: number
          expenses: number
          expensesByCategory: Map<string, number>
        }
      >()

      filtered.forEach((t: Transaction) => {
        const monthKey = getTransactionMonth(t.datetime)
        const categoryName = t.category?.name || "Uncategorized"
        const isIncome = t.amount_number > 0

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            income: 0,
            expenses: 0,
            expensesByCategory: new Map(),
          })
        }

        const data = monthlyData.get(monthKey)!
        if (isIncome) {
          data.income += t.amount_number
        } else {
          const expenseAmount = Math.abs(t.amount_number)
          data.expenses += expenseAmount
          data.expensesByCategory.set(
            categoryName,
            (data.expensesByCategory.get(categoryName) || 0) + expenseAmount
          )
        }
      })

      // Calculate totals and averages
      let totalIncome = 0
      let totalExpenses = 0
      const monthlyBreakdown: Array<{
        month: string
        income: number
        expenses: number
        netSavings: number
        savingsRate: number
      }> = []

      // Aggregate expense categories across all months
      const totalExpensesByCategory = new Map<string, number>()

      Array.from(monthlyData.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, data]) => {
          totalIncome += data.income
          totalExpenses += data.expenses

          const netSavings = data.income - data.expenses
          const savingsRate = data.income > 0 ? (netSavings / data.income) * 100 : 0

          monthlyBreakdown.push({
            month,
            income: Number(data.income.toFixed(2)),
            expenses: Number(data.expenses.toFixed(2)),
            netSavings: Number(netSavings.toFixed(2)),
            savingsRate: Number(savingsRate.toFixed(1)),
          })

          // Aggregate categories
          data.expensesByCategory.forEach((amount, category) => {
            totalExpensesByCategory.set(
              category,
              (totalExpensesByCategory.get(category) || 0) + amount
            )
          })
        })

      // Sort categories by total spending
      const topExpenseCategories = Array.from(totalExpensesByCategory.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, amount]) => ({
          category,
          totalSpent: Number(amount.toFixed(2)),
          percentOfExpenses: Number(((amount / totalExpenses) * 100).toFixed(1)),
          monthlyAverage: Number((amount / monthsToAnalyze).toFixed(2)),
        }))

      // Calculate overall metrics
      const monthsWithData = monthlyBreakdown.length || 1
      const avgMonthlyIncome = totalIncome / monthsWithData
      const avgMonthlyExpenses = totalExpenses / monthsWithData
      const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses
      const overallSavingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

      // Identify potential debt-related payments (common keywords)
      const debtKeywords = [
        "loan",
        "credit card",
        "payment",
        "finance",
        "interest",
        "debt",
        "capital one",
        "chase",
        "discover",
        "amex",
        "american express",
        "citi",
        "wells fargo",
        "bank of america",
        "synchrony",
        "car payment",
        "auto loan",
        "student loan",
        "mortgage",
        "minimum payment",
      ]

      const potentialDebtPayments = filtered
        .filter((t: Transaction) => {
          if (t.amount_number >= 0) return false // Only expenses
          const name = (t.name || "").toLowerCase()
          const merchant = (t.merchantName || "").toLowerCase()
          return debtKeywords.some((keyword) => name.includes(keyword) || merchant.includes(keyword))
        })
        .reduce(
          (acc, t: Transaction) => {
            const merchant = t.merchantName || t.name || "Unknown"
            if (!acc.has(merchant)) {
              acc.set(merchant, { total: 0, count: 0 })
            }
            const data = acc.get(merchant)!
            data.total += Math.abs(t.amount_number)
            data.count += 1
            return acc
          },
          new Map<string, { total: number; count: number }>()
        )

      const debtPaymentsSummary = Array.from(potentialDebtPayments.entries())
        .map(([merchant, data]) => ({
          merchant,
          totalPaid: Number(data.total.toFixed(2)),
          paymentCount: data.count,
          estimatedMonthlyPayment: Number((data.total / monthsWithData).toFixed(2)),
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .slice(0, 5)

      const result = {
        analysisperiod: {
          startDate: startDateStr,
          endDate: endDateStr,
          monthsAnalyzed: monthsWithData,
        },
        overallSummary: {
          totalIncome: Number(totalIncome.toFixed(2)),
          totalExpenses: Number(totalExpenses.toFixed(2)),
          totalNetSavings: Number((totalIncome - totalExpenses).toFixed(2)),
          overallSavingsRate: Number(overallSavingsRate.toFixed(1)),
          avgMonthlyIncome: Number(avgMonthlyIncome.toFixed(2)),
          avgMonthlyExpenses: Number(avgMonthlyExpenses.toFixed(2)),
          avgMonthlySavings: Number(avgMonthlySavings.toFixed(2)),
        },
        monthlyBreakdown,
        topExpenseCategories,
        potentialDebtPayments: debtPaymentsSummary,
        // Key metrics for Baby Step analysis
        babyStepIndicators: {
          // Emergency fund progress (assuming positive net savings accumulates)
          estimatedSavingsAccumulated: Number((avgMonthlySavings * monthsWithData).toFixed(2)),
          // Months of expenses that could be covered
          monthsOfExpensesCovered:
            avgMonthlySavings > 0 ? Number(((avgMonthlySavings * monthsWithData) / avgMonthlyExpenses).toFixed(1)) : 0,
          // Has consistent income
          hasConsistentIncome: monthlyBreakdown.every((m) => m.income > 0),
          // Is saving money consistently
          isSavingConsistently: monthlyBreakdown.filter((m) => m.netSavings > 0).length >= monthsWithData * 0.7,
          // Potential debt detected
          hasDetectedDebtPayments: debtPaymentsSummary.length > 0,
          estimatedMonthlyDebtPayments: debtPaymentsSummary.reduce((sum, d) => sum + d.estimatedMonthlyPayment, 0),
        },
      }

      logInfo("  Returning Ramsey financial snapshot", {
        monthsAnalyzed: result.analysisperiod.monthsAnalyzed,
        totalIncome: result.overallSummary.totalIncome,
        totalExpenses: result.overallSummary.totalExpenses,
        categoriesCount: result.topExpenseCategories.length,
        potentialDebtPaymentsCount: result.potentialDebtPayments.length,
      })

      return result
    } catch (error) {
      logError("  ❌ ERROR in getRamseyFinancialSnapshot:", error)
      throw error
    }
  },
})

/**
 * All available transaction tools
 */
export const transactionTools = {
  getTransactionsByDateRange,
  getSpendingByCategory,
  getSpendingByMerchant,
  getTotalSpending,
  getSpendingTrends,
  renderChart,
  getRamseyFinancialSnapshot,
}
