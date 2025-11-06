import { DailySpendingChart } from "@/components/charts/DailySpendingChart";
import { getLastMonthStats } from "@/lib/dashboard/data";
import { prepareDailySpendingData } from "@/lib/dashboard/calculations";
import { ChartErrorFallback } from "@/components/ErrorFallback";

/**
 * Async Server Component for Daily Spending Chart
 * Fetches and processes data independently with error handling
 */
export async function DailySpendingChartAsync() {
  try {
    const { lastMonthTransactions, lastMonthStart, lastMonthEnd } = await getLastMonthStats();
    const dailySpendingData = prepareDailySpendingData(
      lastMonthTransactions,
      lastMonthStart,
      lastMonthEnd
    );

    return <DailySpendingChart data={dailySpendingData} />;
  } catch (error) {
    console.error("Failed to load daily spending chart:", error);
    return <ChartErrorFallback error={error as Error} />;
  }
}
