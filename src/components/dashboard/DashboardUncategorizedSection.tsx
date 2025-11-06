import { UncategorizedTransactionsSection } from "@/components/dashboard/UncategorizedTransactionsSection";
import { getUncategorizedTransactions } from "@/lib/dashboard/data";

/**
 * Async Server Component for Uncategorized Transactions
 * Fetches uncategorized transactions independently with "use cache"
 */
export async function DashboardUncategorizedSection() {
  const { uncategorizedCount, uncategorizedTransactions } =
    await getUncategorizedTransactions();

  return (
    <UncategorizedTransactionsSection
      count={uncategorizedCount}
      transactions={uncategorizedTransactions}
      displayLimit={10}
    />
  );
}
