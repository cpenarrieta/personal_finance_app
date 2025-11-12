import { format, startOfMonth, subMonths } from "date-fns"
import { TransactionTable } from "@/components/dashboard/TransactionTable"
import { getTopExpensiveTransactions, getLastMonthStats } from "@/lib/dashboard/data"
import { ErrorFallback } from "@/components/shared/ErrorFallback"

interface DashboardTopExpensesSectionProps {
  monthsBack?: number
}

/**
 * Async Server Component for Top Expenses
 * Fetches top expensive transactions independently with "use cache" and error handling
 */
export async function DashboardTopExpensesSection({ monthsBack = 1 }: DashboardTopExpensesSectionProps) {
  try {
    const topExpensiveTransactions = await getTopExpensiveTransactions(monthsBack, 25)

    // Generate period labels
    const now = new Date()
    const endMonth = format(subMonths(now, 1), "MMMM yyyy")
    const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMMM yyyy")
    const periodLabel = monthsBack === 1 ? endMonth : `${startMonth} - ${endMonth}`
    const title = `Top Expenses ${periodLabel}`
    const subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <TransactionTable transactions={topExpensiveTransactions} showCategory={true} />
      </div>
    )
  } catch (error) {
    console.error("Failed to load top expenses:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load top expenses"
        description="Unable to fetch top expense data"
      />
    )
  }
}
