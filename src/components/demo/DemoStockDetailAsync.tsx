import { StockDetail } from "@/components/investments/holdings/StockDetail"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getHoldingsByTicker, getTransactionsByTicker } from "@/lib/demo/queries"

interface DemoStockDetailAsyncProps {
  ticker: string
}

export async function DemoStockDetailAsync({ ticker }: DemoStockDetailAsyncProps) {
  try {
    const [holdingsData, transactions] = await Promise.all([
      getHoldingsByTicker(ticker),
      getTransactionsByTicker(ticker),
    ])

    if (!holdingsData) {
      return (
        <ErrorFallback title="Security not found" description={`No security found with ticker symbol "${ticker}".`} />
      )
    }

    return (
      <StockDetail
        security={(holdingsData as any).security}
        holdings={(holdingsData as any).holdings}
        transactions={(transactions as any) ?? []}
        ticker={ticker}
      />
    )
  } catch (error) {
    logError("Failed to load demo stock detail:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load stock details"
        description="Unable to fetch demo data for this security."
      />
    )
  }
}
