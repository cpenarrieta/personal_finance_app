import { NextRequest } from "next/server"
import { apiSuccess, apiError } from "@/lib/api/response"
import { getSpendingByCategory, getTopExpensesForSummary, getLastMonthStats } from "@/lib/dashboard/data"
import { regenerateSpendingSummary } from "@/lib/ai/generate-spending-summary"
import { logInfo, logError } from "@/lib/utils/logger"

// All filter periods to generate summaries for
const MONTHS_BACK_OPTIONS = [0, 1, 2, 3, 6] as const

/**
 * Cron job to generate AI spending summaries for all filter periods
 * Runs on the 1st of each month at midnight UTC
 *
 * This ensures summaries are always pre-generated and ready when users
 * visit the dashboard, avoiding slow initial loads and reducing API costs.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logError("Unauthorized cron request", undefined, {
      hasAuthHeader: !!authHeader,
    })
    return apiError("Unauthorized", 401, "UNAUTHORIZED")
  }

  logInfo("🕐 Starting scheduled spending summary generation", {
    periods: MONTHS_BACK_OPTIONS,
  })

  const results: { monthsBack: number; success: boolean; error?: string }[] = []

  // Generate summaries for each period sequentially to avoid rate limits
  for (const monthsBack of MONTHS_BACK_OPTIONS) {
    try {
      logInfo(`📊 Generating summary for monthsBack=${monthsBack}`)

      // Fetch fresh data for this period
      const [spendingData, topExpenses, monthStats] = await Promise.all([
        getSpendingByCategory(monthsBack),
        getTopExpensesForSummary(monthsBack, 100),
        getLastMonthStats(monthsBack),
      ])

      // Generate and save the summary
      const summary = await regenerateSpendingSummary(monthsBack, {
        byCategory: spendingData.byCategory,
        bySuperCategory: spendingData.bySuperCategory,
        topExpenses,
        dateRange: spendingData.dateRange,
        totalSpending: monthStats.totalLastMonthSpending,
        totalIncome: monthStats.totalLastMonthIncome,
      })

      if (summary) {
        logInfo(`✅ Successfully generated summary for monthsBack=${monthsBack}`)
        results.push({ monthsBack, success: true })
      } else {
        logError(`Failed to generate summary for monthsBack=${monthsBack}`)
        results.push({ monthsBack, success: false, error: "Generation returned null" })
      }
    } catch (error) {
      logError(`Error generating summary for monthsBack=${monthsBack}:`, error)
      results.push({
        monthsBack,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  logInfo("🏁 Completed scheduled spending summary generation", {
    successCount,
    failureCount,
    results,
  })

  return apiSuccess({
    message: `Generated ${successCount}/${MONTHS_BACK_OPTIONS.length} spending summaries`,
    results,
  })
}
