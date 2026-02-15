import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllTagsWithCounts } from "@/lib/demo/queries"

export async function DemoManageTagsAsync() {
  try {
    const tags = await getAllTagsWithCounts() as any[]

    return (
      <div className="space-y-3">
        {tags.map((tag: any) => (
          <div key={tag.id} className="flex items-center gap-3 border rounded-lg p-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <div className="flex-1">
              <span className="font-medium text-foreground">{tag.name}</span>
              {tag.count != null && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({tag.count} transaction{tag.count !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-muted-foreground">No tags found in demo data.</p>
        )}
      </div>
    )
  } catch (error) {
    logError("Failed to load demo tags:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load tags"
        description="Unable to fetch demo tag data"
      />
    )
  }
}
