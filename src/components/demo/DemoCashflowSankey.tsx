import { CashflowSankeyChart } from "@/components/charts/CashflowSankeyChart"
import { getDemoLastMonthStats } from "@/lib/demo/data"
import { prepareCashflowSankeyData } from "@/lib/dashboard/calculations"
import { ChartErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DemoCashflowSankeyChartAsyncProps {
  monthsBack?: number
}

export async function DemoCashflowSankeyChartAsync({ monthsBack = 1 }: DemoCashflowSankeyChartAsyncProps) {
  try {
    const result = await getDemoLastMonthStats(monthsBack)
    const sankeyData = prepareCashflowSankeyData((result as any).lastMonthTransactions)

    return <CashflowSankeyChart data={sankeyData} />
  } catch (error) {
    logError("Failed to load demo cashflow sankey chart:", error)
    return <ChartErrorFallback error={error as Error} />
  }
}
