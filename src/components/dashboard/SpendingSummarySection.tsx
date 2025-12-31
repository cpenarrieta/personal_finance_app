import { format, startOfMonth, subMonths } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSpendingByCategory, getTopExpensesForSummary, getLastMonthStats } from "@/lib/dashboard/data"
import { generateSpendingSummary, type SpendingSummary } from "@/lib/ai/generate-spending-summary"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  PiggyBank,
  Target,
} from "lucide-react"

interface SpendingSummarySectionProps {
  monthsBack?: number
}

/**
 * Async Server Component for AI-generated Spending Summary
 * Displays 5 facts and 2 saving opportunities based on Dave Ramsey's philosophy
 */
export async function SpendingSummarySection({ monthsBack = 0 }: SpendingSummarySectionProps) {
  try {
    // Fetch all required data in parallel
    const [spendingData, topExpenses, monthStats] = await Promise.all([
      getSpendingByCategory(monthsBack),
      getTopExpensesForSummary(monthsBack, 100),
      getLastMonthStats(monthsBack),
    ])

    // Generate AI summary
    const summary = await generateSpendingSummary({
      byCategory: spendingData.byCategory,
      bySuperCategory: spendingData.bySuperCategory,
      topExpenses,
      dateRange: spendingData.dateRange,
      totalSpending: monthStats.totalLastMonthSpending,
      totalIncome: monthStats.totalLastMonthIncome,
    })

    if (!summary) {
      return null // Silently fail if AI generation fails
    }

    // Generate period label
    const now = new Date()
    let periodLabel: string

    if (monthsBack === 0) {
      periodLabel = format(now, "MMMM yyyy")
    } else if (monthsBack === 1) {
      periodLabel = format(subMonths(now, 1), "MMMM yyyy")
    } else {
      const endMonth = format(subMonths(now, 1), "MMMM yyyy")
      const startMonth = format(startOfMonth(subMonths(now, monthsBack)), "MMMM yyyy")
      periodLabel = `${startMonth} - ${endMonth}`
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" />
            Spending Insights
          </h2>
          <p className="text-muted-foreground">
            AI-powered analysis of your spending for {periodLabel.toLowerCase()}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Facts Section */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Key Facts
              </CardTitle>
              <CardDescription>Insights from your spending patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.facts.map((fact, index) => (
                <FactItem key={index} fact={fact} />
              ))}
            </CardContent>
          </Card>

          {/* Saving Opportunities Section */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                Saving Opportunities
              </CardTitle>
              <CardDescription>
                Actionable tips based on Dave Ramsey&apos;s principles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.savingOpportunities.map((opportunity, index) => (
                <SavingOpportunityItem key={index} opportunity={opportunity} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    logError("Failed to load spending summary:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to generate spending insights"
        description="Unable to analyze spending data"
      />
    )
  }
}

interface FactItemProps {
  fact: SpendingSummary["facts"][number]
}

function FactItem({ fact }: FactItemProps) {
  const getFactIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-success" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <TrendingDown className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "positive":
        return "soft-success" as const
      case "warning":
        return "soft-destructive" as const
      default:
        return "soft-secondary" as const
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="mt-0.5">{getFactIcon(fact.type)}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{fact.title}</span>
          <Badge variant={getBadgeVariant(fact.type)} className="text-xs">
            {fact.type}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{fact.description}</p>
      </div>
    </div>
  )
}

interface SavingOpportunityItemProps {
  opportunity: SpendingSummary["savingOpportunities"][number]
}

function SavingOpportunityItem({ opportunity }: SavingOpportunityItemProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "soft-destructive" as const
      case "medium":
        return "soft" as const
      default:
        return "soft-secondary" as const
    }
  }

  return (
    <div className="rounded-lg border bg-primary/5 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <span className="font-semibold">{opportunity.title}</span>
        </div>
        <Badge variant={getPriorityColor(opportunity.priority)} className="text-xs">
          {opportunity.priority} priority
        </Badge>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{opportunity.description}</p>
      <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2">
        <PiggyBank className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-success">
          Potential savings: {opportunity.potentialSavings}
        </span>
      </div>
    </div>
  )
}
