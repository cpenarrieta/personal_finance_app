import { HoldingsPortfolio } from "@/components/investments/holdings/HoldingsPortfolio"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllHoldings } from "@/lib/demo/queries"

export async function DemoHoldingsPortfolioAsync() {
  try {
    const holdings = await getAllHoldings()
    return <HoldingsPortfolio holdings={holdings as any} />
  } catch (error) {
    logError("Failed to load demo holdings:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load holdings"
        description="Unable to fetch demo investment holdings data"
      />
    )
  }
}
