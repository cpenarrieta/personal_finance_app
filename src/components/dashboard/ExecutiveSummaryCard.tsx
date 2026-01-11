import { getLatestWeeklySummary } from "@/lib/db/queries"
import { formatDistanceToNow } from "date-fns"
import { CollapsibleSummaryCard } from "./CollapsibleSummaryCard"

/**
 * Server Component displaying AI-generated weekly financial insights
 * Shows 5 bullet points of key insights
 */
export async function ExecutiveSummaryCard() {
  const summary = await getLatestWeeklySummary()

  if (!summary) {
    return null
  }

  const generatedAt = summary.generated_at_string ? new Date(summary.generated_at_string) : new Date()
  const timeAgo = formatDistanceToNow(generatedAt) + " ago"

  return <CollapsibleSummaryCard summary={summary.summary} timeAgo={timeAgo} />
}
