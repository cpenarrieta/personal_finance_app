import Image from "next/image"
import { getCategoryImage } from "@/lib/categories/images"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import { getAllCategoriesForManagement } from "@/lib/demo/queries"

export async function DemoManageCategoriesAsync() {
  try {
    const categories = await getAllCategoriesForManagement() as any[]

    return (
      <div className="space-y-6">
        {categories.map((cat: any) => {
          const categoryImage = getCategoryImage(cat.name)
          return (
            <div key={cat.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                {categoryImage ? (
                  <Image
                    src={categoryImage}
                    alt={cat.name}
                    width={32}
                    height={32}
                    className="rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm">
                    {cat.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground">{cat.groupType}</span>
                </div>
              </div>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="pl-11 space-y-1">
                  {cat.subcategories.map((sub: any) => (
                    <div key={sub.id} className="text-sm text-muted-foreground py-1 border-l-2 border-muted pl-3">
                      {sub.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
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
