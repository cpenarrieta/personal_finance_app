import { connection } from "next/server"
import { InvestmentTransactionList } from "@/components/investments/transactions/InvestmentTransactionList"
import { getAllInvestmentTransactions } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

export async function InvestmentTransactionsAsync() {
  // Defer to request time - requires auth and user-specific data
  await connection()

  try {
    const txs = await getAllInvestmentTransactions()
    return <InvestmentTransactionList transactions={txs} showAccount={true} />
  } catch (error) {
    logError("Failed to load investment transactions:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load investment transactions"
        description="Unable to fetch investment transaction data"
      />
    )
  }
}
