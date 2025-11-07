import { InvestmentTransactionList } from "@/components/investments/transactions/InvestmentTransactionList";
import { getAllInvestmentTransactions } from "@/lib/db/queries";
import { ErrorFallback } from "@/components/shared/ErrorFallback";

export async function InvestmentTransactionsAsync() {
  try {
    const txs = await getAllInvestmentTransactions();
    return <InvestmentTransactionList transactions={txs} showAccount={true} />;
  } catch (error) {
    console.error("Failed to load investment transactions:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load investment transactions"
        description="Unable to fetch investment transaction data"
      />
    );
  }
}
