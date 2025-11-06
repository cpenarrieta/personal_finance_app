import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { getRecentTransactions } from "@/lib/dashboard/data";

/**
 * Async Server Component for Recent Transactions
 * Fetches recent transactions independently with "use cache"
 */
export async function DashboardRecentTransactionsSection() {
  const recentTransactions = await getRecentTransactions(20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recent Transactions</h2>
          <p className="text-muted-foreground">Last 20 transactions</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/transactions">View All</Link>
        </Button>
      </div>
      <TransactionTable transactions={recentTransactions} showCategory={true} />
    </div>
  );
}
