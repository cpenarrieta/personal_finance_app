import { CashflowSankeyChart } from "@/components/charts/CashflowSankeyChart"
import { getLastMonthStats } from "@/lib/dashboard/data"
import { prepareCashflowSankeyData } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface CashflowSankeyChartAsyncProps {
  monthsBack?: number
}

/**
 * Async Server Component for Cashflow Sankey Chart
 * Fetches and processes data independently with error handling
 */
export async function CashflowSankeyChartAsync({ monthsBack = 1 }: CashflowSankeyChartAsyncProps) {
  try {
    const { lastMonthTransactions } = await getLastMonthStats(monthsBack)
    const sankeyData = prepareCashflowSankeyData(lastMonthTransactions)

    return <CashflowSankeyChart data={sankeyData} />
  } catch (error) {
    logError("Failed to load cashflow sankey chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
