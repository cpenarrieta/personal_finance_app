import { connection } from "next/server"
import { format, startOfMonth, subMonths } from "date-fns"
import { TransactionTable } from "@/components/dashboard/TransactionTable"
import { getTopExpensiveTransactions } from "@/lib/dashboard/data"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DashboardTopExpensesSectionProps {
  monthsBack?: number
}

/**
 * Async Server Component for Top Expenses
 * Fetches top expensive transactions independently with "use cache" and error handling
 */
export async function DashboardTopExpensesSection({ monthsBack = 0 }: DashboardTopExpensesSectionProps) {
  // Defer to request time - requires auth and user-specific data
  await connection()

  try {
    const topExpensiveTransactions = await getTopExpensiveTransactions(monthsBack, 25)

    // Generate period labels
    const now = new Date()
    let periodLabel: string
    let title: string
    let subtitle: string

    if (monthsBack === 0) {
      periodLabel = format(now, "MMMM yyyy")
      title = `Top Expenses ${periodLabel}`
      subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
    } else if (monthsBack === 1) {
      periodLabel = format(subMonths(now, 1), "MMMM yyyy")
      title = `Top Expenses ${periodLabel}`
      subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
    } else {
      const endMonth = format(subMonths(now, 1), "MMMM yyyy")
      const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMMM yyyy")
      periodLabel = `${startMonth} - ${endMonth}`
      title = `Top Expenses ${periodLabel}`
      subtitle = `Most expensive transactions in ${periodLabel.toLowerCase()}`
    }

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
    logError("Failed to load top expenses:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load top expenses"
        description="Unable to fetch top expense data"
      />
    )
  }
}
