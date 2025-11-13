import { UncategorizedBanner } from "@/components/dashboard/UncategorizedBanner"
import { getUncategorizedTransactions } from "@/lib/dashboard/data"
import { ErrorFallback } from "@/components/shared/ErrorFallback"

/**
 * Async Server Component for Uncategorized Transactions Banner
 * Fetches uncategorized count independently with "use cache" and error handling
 */
export async function DashboardUncategorizedSection() {
  try {
    const { uncategorizedCount } = await getUncategorizedTransactions()

    return <UncategorizedBanner count={uncategorizedCount} />
  } catch (error) {
    console.error("Failed to load uncategorized transactions:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load uncategorized transactions"
        description="Unable to fetch uncategorized transaction data"
      />
    )
  }
}
