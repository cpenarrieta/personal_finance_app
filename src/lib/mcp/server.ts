/**
 * MCP Server for Personal Finance App
 * Exposes financial data tools via Model Context Protocol
 */

import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { z } from "zod"
import {
  getTransactionsInRange,
  calculateSpendingByCategory,
  calculateSpendingByMerchant,
  calculateTotals,
  calculateMonthlyTrends,
  getAccountBalances,
} from "./queries"
import { verifyApiKey } from "./auth"

// Log to help debug serverless issues
console.log("[MCP] Server module loaded", {
  hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
  hasMcpApiKey: !!process.env.MCP_API_KEY,
})

/**
 * Create the base MCP handler with all tools registered
 */
const baseMcpHandler = createMcpHandler(
  (server) => {
    console.log("[MCP] Registering tools...")
    // Tool 1: Get transactions by date range
    server.registerTool(
      "get_transactions",
      {
        title: "Get Transactions",
        description: "Get bank transactions within a date range. Optionally filter by category or merchant.",
        inputSchema: {
          startDate: z.string().describe("Start date in YYYY-MM-DD format (e.g., 2024-01-01)"),
          endDate: z.string().describe("End date in YYYY-MM-DD format (e.g., 2024-01-31)"),
          categoryName: z.string().optional().describe("Filter by category name (e.g., 'Food & Drink')"),
          merchantName: z.string().optional().describe("Filter by merchant name (e.g., 'Starbucks')"),
        },
      },
      async ({
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
        const transactions = await getTransactionsInRange(startDate, endDate, {
          categoryName,
          merchantName,
        })
        return {
          content: [{ type: "text", text: JSON.stringify(transactions, null, 2) }],
        }
      },
    )

    // Tool 2: Get spending by category
    server.registerTool(
      "get_spending_by_category",
      {
        title: "Get Spending by Category",
        description: "Get total spending grouped by category. Only includes expenses (excludes income and transfers).",
        inputSchema: {
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          limit: z.number().optional().default(10).describe("Number of top categories (default: 10)"),
          sortBy: z
            .enum(["amount", "count"])
            .optional()
            .default("amount")
            .describe("Sort by total amount or transaction count"),
        },
      },
      async ({
        startDate,
        endDate,
        limit,
        sortBy,
      }: {
        startDate: string
        endDate: string
        limit?: number
        sortBy?: "amount" | "count"
      }) => {
        const data = await calculateSpendingByCategory(startDate, endDate, limit ?? 10, sortBy ?? "amount")
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        }
      },
    )

    // Tool 3: Get spending by merchant
    server.registerTool(
      "get_spending_by_merchant",
      {
        title: "Get Spending by Merchant",
        description: "Get total spending grouped by merchant. Only includes expenses.",
        inputSchema: {
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          limit: z.number().optional().default(10).describe("Number of top merchants (default: 10)"),
        },
      },
      async ({ startDate, endDate, limit }: { startDate: string; endDate: string; limit?: number }) => {
        const data = await calculateSpendingByMerchant(startDate, endDate, limit ?? 10)
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        }
      },
    )

    // Tool 4: Get total spending
    server.registerTool(
      "get_total_spending",
      {
        title: "Get Total Spending",
        description: "Get total expenses, income, and net amount for a date range.",
        inputSchema: {
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
        },
      },
      async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
        const data = await calculateTotals(startDate, endDate)
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        }
      },
    )

    // Tool 5: Get spending trends
    server.registerTool(
      "get_spending_trends",
      {
        title: "Get Spending Trends",
        description: "Get monthly spending trends. Useful for seeing patterns over time.",
        inputSchema: {
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format"),
          categoryName: z.string().optional().describe("Optional: filter by category name"),
        },
      },
      async ({ startDate, endDate, categoryName }: { startDate: string; endDate: string; categoryName?: string }) => {
        const data = await calculateMonthlyTrends(startDate, endDate, categoryName)
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        }
      },
    )

    // Tool 6: Get accounts
    server.registerTool(
      "get_accounts",
      {
        title: "Get Accounts",
        description: "Get all bank accounts with current balances and institution info.",
        inputSchema: {},
      },
      async () => {
        console.log("[MCP] get_accounts called")
        try {
          const data = await getAccountBalances()
          console.log("[MCP] get_accounts success, count:", data.length)
          return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          }
        } catch (error) {
          console.error("[MCP] get_accounts error:", error)
          throw error
        }
      },
    )

    console.log("[MCP] All tools registered")
  },
  {},
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: true, // Always enable verbose logs for debugging
    onEvent: (event) => {
      console.log("[MCP Event]", JSON.stringify(event))
    },
  },
)

/**
 * MCP handler with API key authentication
 */
export const mcpHandler = withMcpAuth(baseMcpHandler, verifyApiKey, {
  required: !!process.env.MCP_API_KEY,
})
