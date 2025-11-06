import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { getRecentTransactions } from "@/lib/dashboard/data";
import { TransitionLink } from "@/components/TransitionLink";
import { ErrorFallback } from "@/components/ErrorFallback";

/**
 * Async Server Component for Recent Transactions
 * Fetches recent transactions independently with "use cache" and error handling
 */
export async function DashboardRecentTransactionsSection() {
  try {
    const recentTransactions = await getRecentTransactions(20);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Recent Transactions</h2>
            <p className="text-muted-foreground">Last 20 transactions</p>
          </div>
          <TransitionLink href="/transactions" variant="outline">
            View All
          </TransitionLink>
        </div>
        <TransactionTable transactions={recentTransactions} showCategory={true} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load recent transactions:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load recent transactions"
        description="Unable to fetch recent transaction data"
      />
    );
  }
}
