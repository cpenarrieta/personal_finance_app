import { CategoryOrderClient } from "@/components/settings/CategoryOrderClient"
import { getAllCategories } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"

export async function CategoryOrderAsync() {
  try {
    const categories = await getAllCategories()
    return <CategoryOrderClient categories={categories} />
  } catch (error) {
    logError("Failed to load categories:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load categories"
        description="Unable to fetch category data"
      />
    )
  }
}
