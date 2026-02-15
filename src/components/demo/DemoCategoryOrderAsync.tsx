import { CategoryOrderClient } from "@/components/settings/CategoryOrderClient"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllCategories } from "@/lib/demo/queries"

export async function DemoCategoryOrderAsync() {
  try {
    const categories = await getAllCategories()
    return <CategoryOrderClient categories={categories as any} />
  } catch (error) {
    logError("Failed to load demo categories:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load categories"
        description="Unable to fetch demo category data"
      />
    )
  }
}
