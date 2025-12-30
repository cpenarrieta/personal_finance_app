import { SubcategoryChart } from "./SubcategoryChart"
import { getLastMonthStats } from "@/lib/dashboard/data"
import { prepareSpendingBySubcategory } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface SubcategoryChartAsyncProps {
  monthsBack?: number
}

/**
 * Async Server Component for Subcategory Chart
 * Fetches and processes data independently with error handling
 */
export async function SubcategoryChartAsync({ monthsBack = 1 }: SubcategoryChartAsyncProps) {
  try {
    const { lastMonthTransactions } = await getLastMonthStats(monthsBack)
    const spendingBySubcategory = prepareSpendingBySubcategory(lastMonthTransactions, 10)

    return <SubcategoryChart data={spendingBySubcategory} />
  } catch (error) {
    logError("Failed to load subcategory chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
