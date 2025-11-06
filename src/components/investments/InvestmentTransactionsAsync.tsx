import { InvestmentTransactionList } from "@/components/InvestmentTransactionList";
import { getAllInvestmentTransactions } from "@/lib/cached-queries";
import { ErrorFallback } from "@/components/ErrorFallback";

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
