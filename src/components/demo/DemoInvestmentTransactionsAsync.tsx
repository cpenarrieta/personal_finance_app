import { InvestmentTransactionList } from "@/components/investments/transactions/InvestmentTransactionList"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllInvestmentTransactions } from "@/lib/demo/queries"

export async function DemoInvestmentTransactionsAsync() {
  try {
    const txs = await getAllInvestmentTransactions()
    return <InvestmentTransactionList transactions={txs as any} showAccount={true} />
  } catch (error) {
    logError("Failed to load demo investment transactions:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load investment transactions"
        description="Unable to fetch demo investment transaction data"
      />
    )
  }
}
