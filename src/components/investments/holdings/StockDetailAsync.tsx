import { connection } from "next/server"
import { StockDetail } from "@/components/investments/holdings/StockDetail"
import { getHoldingsByTicker, getTransactionsByTicker } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface StockDetailAsyncProps {
  ticker: string
}

export async function StockDetailAsync({ ticker }: StockDetailAsyncProps) {
  await connection()

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
        security={holdingsData.security}
        holdings={holdingsData.holdings}
        transactions={transactions ?? []}
        ticker={ticker}
      />
    )
  } catch (error) {
    logError("Failed to load stock detail:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load stock details"
        description="Unable to fetch data for this security."
      />
    )
  }
}
