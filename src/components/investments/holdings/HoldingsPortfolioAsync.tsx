import { HoldingsPortfolio } from "@/components/investments/holdings/HoldingsPortfolio"
import { getAllHoldings } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

export async function HoldingsPortfolioAsync() {
  try {
    const holdings = await getAllHoldings()
    return <HoldingsPortfolio holdings={holdings} />
  } catch (error) {
    logError("Failed to load holdings:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load holdings"
        description="Unable to fetch investment holdings data"
      />
    )
  }
}
