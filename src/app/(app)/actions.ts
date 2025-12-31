"use server"

import { revalidatePath } from "next/cache"
import { getSpendingByCategory, getTopExpensesForSummary, getLastMonthStats } from "@/lib/dashboard/data"
import { regenerateSpendingSummary } from "@/lib/ai/generate-spending-summary"

/**
 * Refresh the AI spending summary for a given period
 * This will regenerate the summary using fresh data and update the database
 */
export async function refreshSpendingSummary(monthsBack: number): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch fresh data
    const [spendingData, topExpenses, monthStats] = await Promise.all([
      getSpendingByCategory(monthsBack),
      getTopExpensesForSummary(monthsBack, 100),
      getLastMonthStats(monthsBack),
    ])

    // Regenerate and save the summary
    const summary = await regenerateSpendingSummary(monthsBack, {
      byCategory: spendingData.byCategory,
      bySuperCategory: spendingData.bySuperCategory,
      topExpenses,
      dateRange: spendingData.dateRange,
      totalSpending: monthStats.totalLastMonthSpending,
      totalIncome: monthStats.totalLastMonthIncome,
    })

    if (!summary) {
      return { success: false, error: "Failed to generate summary" }
    }

    // Revalidate the dashboard page to show new summary
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error refreshing spending summary:", error)
    return { success: false, error: "An error occurred while refreshing" }
  }
}
