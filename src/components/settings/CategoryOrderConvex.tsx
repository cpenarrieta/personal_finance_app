"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { CategoryGroupType, type CategoryForClient } from "@/types"
import { toast } from "sonner"

function CategoryOrderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-muted h-48 rounded-lg" />
      <div className="animate-pulse bg-muted h-48 rounded-lg" />
    </div>
  )
}

export function CategoryOrderConvex() {
  const categoriesData = useQuery(api.categories.getAll)
  const updateOrder = useMutation(api.categories.updateOrder)

  const [localCategories, setLocalCategories] = useState<CategoryForClient[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Use local state if modified, otherwise use query data
  const categories = localCategories ?? (categoriesData as CategoryForClient[] | undefined)

  // Initialize local state when data loads
  if (categoriesData && !localCategories) {
    // Don't set directly in render - this is a one-time init pattern
  }

  // Group categories by groupType and sort within each group
  const grouped = useMemo(() => {
    if (!categories) return new Map<CategoryGroupType, CategoryForClient[]>()

    const groups = new Map<CategoryGroupType, CategoryForClient[]>()
    for (const cat of categories) {
      const group = cat.groupType || CategoryGroupType.EXPENSES
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(cat)
    }

    // Sort categories within each group by displayOrder
    for (const [groupType, cats] of groups) {
      groups.set(
        groupType,
        cats.sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999)),
      )
    }

    return groups
  }, [categories])

  const groupOrder = [CategoryGroupType.EXPENSES, CategoryGroupType.INCOME, CategoryGroupType.INVESTMENT]

  if (categoriesData === undefined) {
    return <CategoryOrderSkeleton />
  }

  const moveUp = (categoryId: string) => {
    const currentCats = localCategories ?? (categoriesData as CategoryForClient[])
    const cat = currentCats.find((c) => c.id === categoryId)
    if (!cat) return

    // Get all categories in the same group, sorted by displayOrder
    const groupCats = currentCats
      .filter((c) => (c.groupType || CategoryGroupType.EXPENSES) === (cat.groupType || CategoryGroupType.EXPENSES))
      .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999))

    const index = groupCats.findIndex((c) => c.id === categoryId)
    if (index <= 0) return

    // Swap displayOrder with previous category
    const prevCat = groupCats[index - 1]
    const currentOrder = cat.displayOrder ?? index
    const prevOrder = prevCat?.displayOrder ?? index - 1

    const updated = currentCats.map((c) => {
      if (c.id === categoryId) {
        return { ...c, displayOrder: prevOrder }
      }
      if (c.id === prevCat?.id) {
        return { ...c, displayOrder: currentOrder }
      }
      return c
    })
    setLocalCategories(updated)
  }

  const moveDown = (categoryId: string) => {
    const currentCats = localCategories ?? (categoriesData as CategoryForClient[])
    const cat = currentCats.find((c) => c.id === categoryId)
    if (!cat) return

    // Get all categories in the same group, sorted by displayOrder
    const groupCats = currentCats
      .filter((c) => (c.groupType || CategoryGroupType.EXPENSES) === (cat.groupType || CategoryGroupType.EXPENSES))
      .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999))

    const index = groupCats.findIndex((c) => c.id === categoryId)
    if (index === -1 || index >= groupCats.length - 1) return

    // Swap displayOrder with next category
    const nextCat = groupCats[index + 1]
    const currentOrder = cat.displayOrder ?? index
    const nextOrder = nextCat?.displayOrder ?? index + 1

    const updated = currentCats.map((c) => {
      if (c.id === categoryId) {
        return { ...c, displayOrder: nextOrder }
      }
      if (c.id === nextCat?.id) {
        return { ...c, displayOrder: currentOrder }
      }
      return c
    })
    setLocalCategories(updated)
  }

  const changeGroup = (categoryId: string, newGroupType: CategoryGroupType) => {
    const currentCats = localCategories ?? (categoriesData as CategoryForClient[])
    const updated = currentCats.map((c) =>
      c.id === categoryId ? { ...c, groupType: newGroupType, displayOrder: 9999 } : c,
    )
    setLocalCategories(updated)
  }

  const handleSave = async () => {
    if (!localCategories) {
      toast.info("No changes to save")
      return
    }

    setIsSaving(true)

    try {
      const updates = localCategories.map((cat) => ({
        id: cat.id as Id<"categories">,
        groupType: cat.groupType as "EXPENSES" | "INCOME" | "INVESTMENT" | "TRANSFER" | null | undefined,
        displayOrder: cat.displayOrder ?? undefined,
      }))

      await updateOrder({ updates })
      setLocalCategories(null) // Reset to use fresh query data
      toast.success("Category order saved successfully!")
    } catch (error) {
      toast.error("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !localCategories}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Category Groups */}
      {groupOrder.map((groupType) => {
        const groupCats = grouped.get(groupType) || []
        if (groupCats.length === 0) return null

        return (
          <div key={groupType} className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{groupType}</h2>

            <div className="space-y-2">
              {groupCats.map((cat, index) => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-mono w-8">{index + 1}.</span>
                    <span>{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Move up/down */}
                    <Button onClick={() => moveUp(cat.id)} disabled={index === 0} variant="outline" size="sm">
                      ↑
                    </Button>
                    <Button
                      onClick={() => moveDown(cat.id)}
                      disabled={index === groupCats.length - 1}
                      variant="outline"
                      size="sm"
                    >
                      ↓
                    </Button>

                    {/* Change group */}
                    <select
                      value={groupType}
                      onChange={(e) => changeGroup(cat.id, e.target.value as CategoryGroupType)}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      {groupOrder.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !localCategories}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
