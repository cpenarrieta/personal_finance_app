import { SubcategoryChart } from "@/components/charts/SubcategoryChart"
import { getLastMonthStats } from "@/lib/dashboard/data"
import { prepareSpendingBySubcategory } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"

/**
 * Async Server Component for Subcategory Chart
 * Fetches and processes data independently with error handling
 */
export async function SubcategoryChartAsync() {
  try {
    const { lastMonthTransactions } = await getLastMonthStats()
    const spendingBySubcategory = prepareSpendingBySubcategory(lastMonthTransactions, 10)

    return <SubcategoryChart data={spendingBySubcategory} />
  } catch (error) {
    console.error("Failed to load subcategory chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
