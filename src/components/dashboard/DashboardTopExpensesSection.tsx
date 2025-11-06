import { format } from "date-fns";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { getTopExpensiveTransactions, getLastMonthStats } from "@/lib/dashboard/data";
import { ErrorFallback } from "@/components/ErrorFallback";

/**
 * Async Server Component for Top Expenses
 * Fetches top expensive transactions independently with "use cache" and error handling
 */
export async function DashboardTopExpensesSection() {
  try {
    const [topExpensiveTransactions, { lastMonthStart }] = await Promise.all([
      getTopExpensiveTransactions(25),
      getLastMonthStats(),
    ]);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">
            Top Expenses {format(lastMonthStart, "MMMM yyyy")}
          </h2>
          <p className="text-muted-foreground">
            Most expensive transactions in {format(lastMonthStart, "MMMM yyyy")}
          </p>
        </div>
        <TransactionTable
          transactions={topExpensiveTransactions}
          showCategory={true}
        />
      </div>
    );
  } catch (error) {
    console.error("Failed to load top expenses:", error);
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load top expenses"
        description="Unable to fetch top expense data"
      />
    );
  }
}
