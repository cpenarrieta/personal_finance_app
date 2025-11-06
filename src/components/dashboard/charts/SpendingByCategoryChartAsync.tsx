import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart";
import { getLastMonthStats } from "@/lib/dashboard/data";
import { prepareSpendingByCategory } from "@/lib/dashboard/calculations";
import { ChartErrorFallback } from "@/components/ErrorFallback";

/**
 * Async Server Component for Spending by Category Chart
 * Fetches and processes data independently with error handling
 */
export async function SpendingByCategoryChartAsync() {
  try {
    const { lastMonthTransactions } = await getLastMonthStats();
    const spendingByCategory = prepareSpendingByCategory(lastMonthTransactions, 10);

    return <SpendingByCategoryChart data={spendingByCategory} />;
  } catch (error) {
    console.error("Failed to load spending by category chart:", error);
    return <ChartErrorFallback error={error as Error} />;
  }
}
