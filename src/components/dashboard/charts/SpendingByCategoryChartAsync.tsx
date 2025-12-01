import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart"
import { getLastMonthStats } from "@/lib/dashboard/data"
import { prepareSpendingByCategory } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface SpendingByCategoryChartAsyncProps {
  monthsBack?: number
}

/**
 * Async Server Component for Spending by Category Chart
 * Fetches and processes data independently with error handling
 */
export async function SpendingByCategoryChartAsync({ monthsBack = 1 }: SpendingByCategoryChartAsyncProps) {
  try {
    const { lastMonthTransactions } = await getLastMonthStats(monthsBack)
    const spendingByCategory = prepareSpendingByCategory(lastMonthTransactions, 10)

    return <SpendingByCategoryChart data={spendingByCategory} />
  } catch (error) {
    logError("Failed to load spending by category chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
