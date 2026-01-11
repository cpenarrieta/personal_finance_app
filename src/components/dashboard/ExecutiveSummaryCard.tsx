import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { getLatestWeeklySummary } from "@/lib/db/queries"
import { formatDistanceToNow } from "date-fns"

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Weekly Insights</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNow(generatedAt)} ago</span>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{summary.summary}</div>
      </CardContent>
    </Card>
  )
}
