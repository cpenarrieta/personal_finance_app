import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CategoryForClient, CategoryGroupType } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sort categories by group type (EXPENSES → INVESTMENT → INCOME) and display order
 * @param categories - Array of categories to sort
 * @returns Sorted flat array of categories
 */
export function sortCategoriesByGroupAndOrder(categories: CategoryForClient[]): CategoryForClient[] {
  const groupOrder: CategoryGroupType[] = [
    "EXPENSES" as CategoryGroupType,
    "INVESTMENT" as CategoryGroupType,
    "INCOME" as CategoryGroupType,
  ]
  const grouped = new Map<CategoryGroupType, CategoryForClient[]>()

  // Group categories by groupType
  for (const category of categories) {
    const groupType = category.groupType || ("EXPENSES" as CategoryGroupType)
    if (!grouped.has(groupType)) {
      grouped.set(groupType, [])
    }
    grouped.get(groupType)!.push(category)
  }

  // Sort categories within each group by displayOrder
  for (const [, cats] of grouped) {
    cats.sort((a, b) => {
      const orderA = a.displayOrder ?? 9999
      const orderB = b.displayOrder ?? 9999
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name) // Fallback to name if same order
    })
  }

  // Flatten groups in the defined order
  return groupOrder.filter((groupType) => grouped.has(groupType)).flatMap((groupType) => grouped.get(groupType)!)
}

/**
 * Format amount as currency with symbol
 * @param amount - Numeric amount to format (negative=expense, positive=income)
 * @param currency - Currency code (default: "USD")
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: currency,
  })
}

/**
 * Format amount as numeric value with 2 decimal places
 * @param amount - Numeric amount to format (negative=expense, positive=income)
 * @returns Formatted numeric string (e.g., "1,234.56")
 */
export function formatAmount(amount: number): string {
  return Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format percentage with 2 decimal places
 * @param value - Numeric value to format as percentage
 * @returns Formatted percentage string (e.g., "12.34%")
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}
