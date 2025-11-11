import type { DateRange } from "@/hooks/useTransactionFilters"

export interface TransactionFiltersFromUrl {
  dateRange?: DateRange
  customStartDate?: string
  customEndDate?: string
  selectedCategoryIds?: Set<string>
  selectedSubcategoryIds?: Set<string>
  excludedCategoryIds?: Set<string>
  showIncome?: boolean
  showExpenses?: boolean
  showTransfers?: boolean
  searchQuery?: string
  selectedTagIds?: Set<string>
  showOnlyUncategorized?: boolean
  selectedAccountIds?: Set<string>
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

/**
 * Parse URL search params into transaction filters
 */
export function parseTransactionFiltersFromUrl(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): TransactionFiltersFromUrl {
  const filters: TransactionFiltersFromUrl = {}

  // Convert searchParams to a consistent format
  const getParam = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined
    }
    const value = searchParams[key]
    return Array.isArray(value) ? value[0] : value
  }

  // Date range
  const dateRange = getParam("dateRange")
  if (dateRange && isValidDateRange(dateRange)) {
    filters.dateRange = dateRange as DateRange
  }

  // Custom dates
  const startDate = getParam("startDate")
  if (startDate) {
    filters.customStartDate = startDate
  }

  const endDate = getParam("endDate")
  if (endDate) {
    filters.customEndDate = endDate
  }

  // Categories (comma-separated IDs)
  const categoryIds = getParam("categoryId")
  if (categoryIds) {
    filters.selectedCategoryIds = new Set(categoryIds.split(","))
  }

  // Subcategories (comma-separated IDs)
  const subcategoryIds = getParam("subcategoryId")
  if (subcategoryIds) {
    filters.selectedSubcategoryIds = new Set(subcategoryIds.split(","))
  }

  // Excluded categories (comma-separated IDs)
  const excludedCategoryIds = getParam("excludeCategory")
  if (excludedCategoryIds) {
    filters.excludedCategoryIds = new Set(excludedCategoryIds.split(","))
  }

  // Account IDs (comma-separated)
  const accountIds = getParam("accountId")
  if (accountIds) {
    filters.selectedAccountIds = new Set(accountIds.split(","))
  }

  // Tag IDs (comma-separated)
  const tagIds = getParam("tagId")
  if (tagIds) {
    filters.selectedTagIds = new Set(tagIds.split(","))
  }

  // Income/Expense/Transfer toggles
  const showIncome = getParam("showIncome")
  if (showIncome !== undefined) {
    filters.showIncome = showIncome === "true"
  }

  const showExpenses = getParam("showExpenses")
  if (showExpenses !== undefined) {
    filters.showExpenses = showExpenses === "true"
  }

  const showTransfers = getParam("showTransfers")
  if (showTransfers !== undefined) {
    filters.showTransfers = showTransfers === "true"
  }

  // Uncategorized filter
  const uncategorized = getParam("uncategorized")
  if (uncategorized !== undefined) {
    filters.showOnlyUncategorized = uncategorized === "true"
  }

  // Search query
  const search = getParam("search")
  if (search) {
    filters.searchQuery = search
  }

  // Sort
  const sortBy = getParam("sortBy")
  if (sortBy) {
    filters.sortBy = sortBy
  }

  const sortDirection = getParam("sortDirection")
  if (sortDirection === "asc" || sortDirection === "desc") {
    filters.sortDirection = sortDirection
  }

  return filters
}

/**
 * Convert transaction filters to URL search params
 */
export function transactionFiltersToUrlParams(filters: TransactionFiltersFromUrl): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.dateRange && filters.dateRange !== "all") {
    params.set("dateRange", filters.dateRange)
  }

  if (filters.customStartDate) {
    params.set("startDate", filters.customStartDate)
  }

  if (filters.customEndDate) {
    params.set("endDate", filters.customEndDate)
  }

  if (filters.selectedCategoryIds && filters.selectedCategoryIds.size > 0) {
    params.set("categoryId", Array.from(filters.selectedCategoryIds).join(","))
  }

  if (filters.selectedSubcategoryIds && filters.selectedSubcategoryIds.size > 0) {
    params.set("subcategoryId", Array.from(filters.selectedSubcategoryIds).join(","))
  }

  if (filters.excludedCategoryIds && filters.excludedCategoryIds.size > 0) {
    params.set("excludeCategory", Array.from(filters.excludedCategoryIds).join(","))
  }

  if (filters.selectedAccountIds && filters.selectedAccountIds.size > 0) {
    params.set("accountId", Array.from(filters.selectedAccountIds).join(","))
  }

  if (filters.selectedTagIds && filters.selectedTagIds.size > 0) {
    params.set("tagId", Array.from(filters.selectedTagIds).join(","))
  }

  if (filters.showIncome !== undefined) {
    params.set("showIncome", filters.showIncome.toString())
  }

  if (filters.showExpenses !== undefined) {
    params.set("showExpenses", filters.showExpenses.toString())
  }

  if (filters.showTransfers) {
    params.set("showTransfers", "true")
  }

  if (filters.showOnlyUncategorized) {
    params.set("uncategorized", "true")
  }

  if (filters.searchQuery) {
    params.set("search", filters.searchQuery)
  }

  if (filters.sortBy && filters.sortBy !== "date") {
    params.set("sortBy", filters.sortBy)
  }

  if (filters.sortDirection && filters.sortDirection !== "desc") {
    params.set("sortDirection", filters.sortDirection)
  }

  return params
}

function isValidDateRange(value: string): value is DateRange {
  return ["all", "last30", "last90", "thisMonth", "lastMonth", "custom"].includes(value)
}
