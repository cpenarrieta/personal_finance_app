import { format } from "date-fns";
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart";
import { SubcategoryChart } from "@/components/charts/SubcategoryChart";
import { DailySpendingChart } from "@/components/charts/DailySpendingChart";
import { getLastMonthStats } from "@/lib/dashboard/data";
import {
  prepareSpendingByCategory,
  prepareSpendingBySubcategory,
  prepareDailySpendingData,
} from "@/lib/dashboard/calculations";

/**
 * Async Server Component for Last Month Overview
 * Fetches last month stats and prepares chart data independently with "use cache"
 */
export async function DashboardLastMonthSection() {
  const {
    lastMonthTransactions,
    lastMonthStart,
    lastMonthEnd,
  } = await getLastMonthStats();

  const spendingByCategory = prepareSpendingByCategory(
    lastMonthTransactions,
    10
  );
  const spendingBySubcategory = prepareSpendingBySubcategory(
    lastMonthTransactions,
    10
  );
  const dailySpendingData = prepareDailySpendingData(
    lastMonthTransactions,
    lastMonthStart,
    lastMonthEnd
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Last Month Overview</h2>
        <p className="text-muted-foreground">
          {format(lastMonthStart, "MMMM yyyy")} Financial Analysis
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SpendingByCategoryChart data={spendingByCategory} />
        <SubcategoryChart data={spendingBySubcategory} />
        <DailySpendingChart data={dailySpendingData} />
      </div>
    </div>
  );
}
