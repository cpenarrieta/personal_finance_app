import { format } from "date-fns";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { getTopExpensiveTransactions, getLastMonthStats } from "@/lib/dashboard/data";

/**
 * Async Server Component for Top Expenses
 * Fetches top expensive transactions independently with "use cache"
 */
export async function DashboardTopExpensesSection() {
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
}
