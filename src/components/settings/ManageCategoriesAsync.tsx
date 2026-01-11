import Image from "next/image"
import { DeleteButton } from "@/components/shared/DeleteButton"
import { getCategoryImage } from "@/lib/categories/images"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TransferCategoryToggle } from "@/components/transactions/filters/TransferCategoryToggle"
import { getAllCategoriesForManagement } from "@/lib/db/queries-settings"
import { logError } from "@/lib/utils/logger"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import type { Prisma } from "@prisma/generated"
import {
  createCategory,
  updateCategoryGroupType,
  deleteCategory,
  createSubcategory,
  deleteSubcategory,
} from "@/app/(app)/settings/manage-categories/actions"

type CategoryWithSubs = Prisma.CategoryGetPayload<{
  include: { subcategories: true }
}>

export async function ManageCategoriesAsync() {
  try {
    const categories = await getAllCategoriesForManagement()

    return (
      <>
        {/* Add Category Form */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add New Category</h2>
          <form action={createCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  type="text"
                  name="name"
                  placeholder="e.g., Income, Food, Transportation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-image">Image URL (optional)</Label>
                <Input id="category-image" type="text" name="imageUrl" placeholder="https://example.com/icon.png" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is-transfer-category" name="isTransferCategory" value="true" />
              <Label htmlFor="is-transfer-category" className="text-sm font-normal cursor-pointer">
                This is a transfer category (transactions moving between accounts)
              </Label>
            </div>
            <Button type="submit">+ Add Category</Button>
          </form>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Your Categories ({categories.length})</h2>

          {categories.length === 0 ? (
            <div className="bg-card rounded-lg shadow-md p-8 text-center">
              <p className="text-muted-foreground">No categories yet. Create your first category above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat: CategoryWithSubs) => (
                <div key={cat.id} className="bg-card rounded-lg shadow-md overflow-hidden">
                  {/* Category Header */}
                  <div className="p-4 bg-muted/50 border-b">
                    <div className="flex items-center gap-3">
                      {getCategoryImage(cat.name, cat.imageUrl) && (
                        <div className="flex-shrink-0">
                          <Image
                            src={getCategoryImage(cat.name, cat.imageUrl)!}
                            alt={cat.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover border"
                            unoptimized={getCategoryImage(cat.name, cat.imageUrl)!.startsWith("/images/")}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cat.subcategories.length === 0
                            ? "No subcategories"
                            : `${cat.subcategories.length} subcategory${cat.subcategories.length > 1 ? "ies" : ""}`}
                        </p>
                        <div className="mt-2">
                          <TransferCategoryToggle
                            categoryId={cat.id}
                            isTransferCategory={cat.groupType === "TRANSFER"}
                            updateAction={updateCategoryGroupType}
                          />
                        </div>
                      </div>
                      <DeleteButton
                        id={cat.id}
                        action={deleteCategory}
                        confirmMessage={`Are you sure you want to delete "${cat.name}"?${
                          cat.subcategories.length > 0
                            ? ` This will also delete ${cat.subcategories.length} subcategory(ies).`
                            : ""
                        }`}
                        buttonText="Delete Category"
                        className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                      />
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div className="p-4">
                    {cat.subcategories.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {cat.subcategories.map((sub: Prisma.SubcategoryGetPayload<{}>) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                          >
                            {getCategoryImage(sub.name, sub.imageUrl) && (
                              <Image
                                src={getCategoryImage(sub.name, sub.imageUrl)!}
                                alt={sub.name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded object-cover border"
                                unoptimized={getCategoryImage(sub.name, sub.imageUrl)!.startsWith("/images/")}
                              />
                            )}
                            <span className="flex-1 text-foreground font-medium">{sub.name}</span>
                            <DeleteButton
                              id={sub.id}
                              action={deleteSubcategory}
                              confirmMessage={`Are you sure you want to delete "${sub.name}"?`}
                              buttonText="Remove"
                              className="px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded text-sm font-medium transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Subcategory Form */}
                    <form action={createSubcategory} className="border-t pt-4 space-y-2">
                      <input type="hidden" name="categoryId" value={cat.id} />
                      <Label>Add Subcategory</Label>
                      <div className="flex gap-2">
                        <Input type="text" name="name" placeholder="Subcategory name" className="flex-1" />
                        <Input type="text" name="imageUrl" placeholder="Image URL (optional)" className="w-48" />
                        <Button type="submit" size="sm" className="bg-success hover:bg-success/90">
                          + Add
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
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
