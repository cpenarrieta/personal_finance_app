import { connection } from "next/server"
import { DailySpendingChart } from "./DailySpendingChart"
import { getLastMonthStats } from "@/lib/dashboard/data"
import { prepareDailySpendingData } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DailySpendingChartAsyncProps {
  monthsBack?: number
}

/**
 * Async Server Component for Daily Spending Chart
 * Fetches and processes data independently with error handling
 */
export async function DailySpendingChartAsync({ monthsBack = 1 }: DailySpendingChartAsyncProps) {
  // Defer to request time - requires auth and user-specific data
  await connection()

  try {
    const { lastMonthTransactions, lastMonthStart, lastMonthEnd } = await getLastMonthStats(monthsBack)
    const dailySpendingData = prepareDailySpendingData(lastMonthTransactions, lastMonthStart, lastMonthEnd)

    return <DailySpendingChart data={dailySpendingData} />
  } catch (error) {
    logError("Failed to load daily spending chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
