import { format, startOfMonth, subMonths } from "date-fns"
import { TransactionTable } from "@/components/dashboard/TransactionTable"
import { getDemoTopExpensiveTransactions } from "@/lib/demo/data"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

interface DemoDashboardTopExpensesSectionProps {
  monthsBack?: number
}

export async function DemoDashboardTopExpensesSection({ monthsBack = 0 }: DemoDashboardTopExpensesSectionProps) {
  try {
    const topExpensiveTransactions = await getDemoTopExpensiveTransactions(monthsBack, 25)

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
        <TransactionTable transactions={topExpensiveTransactions as any} showCategory={true} />
      </div>
    )
  } catch (error) {
    logError("Failed to load demo top expenses:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load top expenses"
        description="Unable to fetch demo expense data"
      />
    )
  }
}
