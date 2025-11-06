import { UncategorizedTransactionsSection } from "@/components/dashboard/UncategorizedTransactionsSection";
import { getUncategorizedTransactions } from "@/lib/dashboard/data";
import { ErrorFallback } from "@/components/ErrorFallback";

/**
 * Async Server Component for Uncategorized Transactions
 * Fetches uncategorized transactions independently with "use cache" and error handling
 */
export async function DashboardUncategorizedSection() {
  try {
    const { uncategorizedCount, uncategorizedTransactions } =
      await getUncategorizedTransactions();

    return (
      <UncategorizedTransactionsSection
        count={uncategorizedCount}
        transactions={uncategorizedTransactions}
        displayLimit={10}
      />
    );
  } catch (error) {
    console.error("Failed to load uncategorized transactions:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load uncategorized transactions"
        description="Unable to fetch uncategorized transaction data"
      />
    );
  }
}
