import type { CategoryForClient } from "@/types"

export function useCategoryToggle() {
  // Toggle category selection
  const toggleCategory = (
    categoryId: string,
    selectedCategoryIds: Set<string>,
    setSelectedCategoryIds: (ids: Set<string>) => void,
    selectedSubcategoryIds: Set<string>,
    setSelectedSubcategoryIds: (ids: Set<string>) => void,
    categories: CategoryForClient[],
  ) => {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      // Also remove all subcategories of this category
      const category = categories.find((c) => c.id === categoryId)
      if (category && category.subcategories) {
        const newSelectedSubs = new Set(selectedSubcategoryIds)
        category.subcategories.forEach((sub) => newSelectedSubs.delete(sub.id))
        setSelectedSubcategoryIds(newSelectedSubs)
      }
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategoryIds(newSelected)
  }

  // Toggle subcategory selection
  const toggleSubcategory = (
    subcategoryId: string,
    categoryId: string,
    selectedCategoryIds: Set<string>,
    setSelectedCategoryIds: (ids: Set<string>) => void,
    selectedSubcategoryIds: Set<string>,
    setSelectedSubcategoryIds: (ids: Set<string>) => void,
  ) => {
    const newSelected = new Set(selectedSubcategoryIds)
    if (newSelected.has(subcategoryId)) {
      newSelected.delete(subcategoryId)
    } else {
      newSelected.add(subcategoryId)
      // Also select the parent category if not selected
      if (!selectedCategoryIds.has(categoryId)) {
        setSelectedCategoryIds(new Set(selectedCategoryIds).add(categoryId))
      }
    }
    setSelectedSubcategoryIds(newSelected)
  }

  // Toggle excluded category
  const toggleExcludedCategory = (
    categoryId: string,
    excludedCategoryIds: Set<string>,
    setExcludedCategoryIds: (ids: Set<string>) => void,
  ) => {
    const newExcluded = new Set(excludedCategoryIds)
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId)
    } else {
      newExcluded.add(categoryId)
    }
    setExcludedCategoryIds(newExcluded)
  }

  return {
    toggleCategory,
    toggleSubcategory,
    toggleExcludedCategory,
  }
}
