"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { getCategoryImage } from "@/lib/categories/images"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function ManageCategoriesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse bg-muted h-48 rounded-lg" />
      <div className="animate-pulse bg-muted h-32 rounded-lg" />
      <div className="animate-pulse bg-muted h-32 rounded-lg" />
    </div>
  )
}

export function ManageCategoriesConvex() {
  const categories = useQuery(api.categories.getAllForManagement)
  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)
  const removeCategory = useMutation(api.categories.remove)
  const createSubcategory = useMutation(api.categories.createSubcategory)
  const removeSubcategory = useMutation(api.categories.removeSubcategory)

  // Form state for new category
  const [newCatName, setNewCatName] = useState("")
  const [newCatImageUrl, setNewCatImageUrl] = useState("")
  const [newCatIsTransfer, setNewCatIsTransfer] = useState(false)
  const [isCreatingCat, setIsCreatingCat] = useState(false)

  // Form state for new subcategory (keyed by category ID)
  const [newSubcatName, setNewSubcatName] = useState<Record<string, string>>({})
  const [newSubcatImageUrl, setNewSubcatImageUrl] = useState<Record<string, string>>({})

  if (categories === undefined) {
    return <ManageCategoriesSkeleton />
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      toast.error("Category name is required")
      return
    }

    setIsCreatingCat(true)
    try {
      await createCategory({
        name: newCatName.trim(),
        imageUrl: newCatImageUrl.trim() || undefined,
        groupType: newCatIsTransfer ? "TRANSFER" : undefined,
      })
      setNewCatName("")
      setNewCatImageUrl("")
      setNewCatIsTransfer(false)
      toast.success("Category created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category")
    } finally {
      setIsCreatingCat(false)
    }
  }

  const handleToggleTransfer = async (categoryId: string, isCurrentlyTransfer: boolean) => {
    try {
      await updateCategory({
        id: categoryId as Id<"categories">,
        groupType: isCurrentlyTransfer ? undefined : "TRANSFER",
      })
      toast.success(isCurrentlyTransfer ? "Transfer status removed" : "Marked as transfer category")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category")
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await removeCategory({ id: categoryId as Id<"categories"> })
      toast.success("Category deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category")
    }
  }

  const handleCreateSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault()
    const name = newSubcatName[categoryId]?.trim()
    if (!name) {
      toast.error("Subcategory name is required")
      return
    }

    try {
      await createSubcategory({
        categoryId: categoryId as Id<"categories">,
        name,
        imageUrl: newSubcatImageUrl[categoryId]?.trim() || undefined,
      })
      setNewSubcatName((prev) => ({ ...prev, [categoryId]: "" }))
      setNewSubcatImageUrl((prev) => ({ ...prev, [categoryId]: "" }))
      toast.success("Subcategory created")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create subcategory")
    }
  }

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      await removeSubcategory({ id: subcategoryId as Id<"subcategories"> })
      toast.success("Subcategory deleted")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete subcategory")
    }
  }

  return (
    <>
      {/* Add Category Form */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Add New Category</h2>
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g., Income, Food, Transportation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-image">Image URL (optional)</Label>
              <Input
                id="category-image"
                type="text"
                value={newCatImageUrl}
                onChange={(e) => setNewCatImageUrl(e.target.value)}
                placeholder="https://example.com/icon.png"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-transfer-category"
              checked={newCatIsTransfer}
              onCheckedChange={(checked) => setNewCatIsTransfer(checked === true)}
            />
            <Label htmlFor="is-transfer-category" className="text-sm font-normal cursor-pointer">
              This is a transfer category (transactions moving between accounts)
            </Label>
          </div>
          <Button type="submit" disabled={isCreatingCat}>
            {isCreatingCat ? "Creating..." : "+ Add Category"}
          </Button>
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
            {categories.map((cat) => (
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
                      <div className="mt-2 flex items-center gap-2">
                        <Switch
                          id={`transfer-${cat.id}`}
                          checked={cat.groupType === "TRANSFER"}
                          onCheckedChange={() => handleToggleTransfer(cat.id, cat.groupType === "TRANSFER")}
                        />
                        <Label htmlFor={`transfer-${cat.id}`} className="text-sm cursor-pointer">
                          Transfer category
                        </Label>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{cat.name}"?
                            {cat.subcategories.length > 0 && (
                              <> This will also delete {cat.subcategories.length} subcategory(ies).</>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="p-4">
                  {cat.subcategories.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {cat.subcategories.map((sub) => (
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

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{sub.name}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSubcategory(sub.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Subcategory Form */}
                  <form onSubmit={(e) => handleCreateSubcategory(e, cat.id)} className="border-t pt-4 space-y-2">
                    <Label>Add Subcategory</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newSubcatName[cat.id] || ""}
                        onChange={(e) => setNewSubcatName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="Subcategory name"
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        value={newSubcatImageUrl[cat.id] || ""}
                        onChange={(e) => setNewSubcatImageUrl((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="Image URL (optional)"
                        className="w-48"
                      />
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
}
