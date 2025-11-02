import { useState, useMemo } from 'react'
import { startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import type { CategoryForClient, TransactionForClient, TagForClient } from '@/types'

export type DateRange = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'

interface UseTransactionFiltersConfig {
  categories: CategoryForClient[]
  tags?: TagForClient[]
  accounts?: Array<{ id: string; name: string; type: string; mask?: string | null }>
  defaultDateRange?: DateRange
  defaultShowIncome?: boolean
  defaultShowExpenses?: boolean
  excludeTransfersByDefault?: boolean
  enableSearch?: boolean
  enableTagFilter?: boolean
  enableUncategorizedFilter?: boolean
  enableAccountFilter?: boolean
}

export function useTransactionFilters({
  categories,
  tags: _tags = [],
  accounts: _accounts = [],
  defaultDateRange = 'all',
  defaultShowIncome = false,
  defaultShowExpenses = true,
  excludeTransfersByDefault = true,
  enableSearch = false,
  enableTagFilter = false,
  enableUncategorizedFilter = false,
  enableAccountFilter = false,
}: UseTransactionFiltersConfig) {
  // Date filters
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Category filters
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(() => {
    if (!excludeTransfersByDefault) return new Set()
    const transfersCategory = categories.find((cat) => cat.name === '🔁 Transfers')
    return transfersCategory ? new Set([transfersCategory.id]) : new Set()
  })

  // Income/Expense toggles
  const [showIncome, setShowIncome] = useState(defaultShowIncome)
  const [showExpenses, setShowExpenses] = useState(defaultShowExpenses)

  // Category dropdown visibility
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // Optional: Search
  const [searchQuery, setSearchQuery] = useState(enableSearch ? '' : undefined)

  // Optional: Tags
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    enableTagFilter ? new Set() : (undefined as never)
  )

  // Optional: Uncategorized
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(
    enableUncategorizedFilter ? false : undefined
  )

  // Optional: Account
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    enableAccountFilter ? new Set() : (undefined as never)
  )

  // Get date range interval
  const dateInterval = useMemo(() => {
    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    switch (dateRange) {
      case 'last30': {
        const start = new Date(now)
        start.setDate(now.getDate() - 29) // -29 days to include today (30 days total)
        start.setHours(0, 0, 0, 0)
        return { start, end: endOfToday }
      }
      case 'last90': {
        const start = new Date(now)
        start.setDate(now.getDate() - 89) // -89 days to include today (90 days total)
        start.setHours(0, 0, 0, 0)
        return { start, end: endOfToday }
      }
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: new Date(customStartDate), end: new Date(customEndDate) }
        }
        return null
      case 'all':
      default:
        return null
    }
  }, [dateRange, customStartDate, customEndDate])

  // Filter transactions
  const filterTransactions = (transactions: TransactionForClient[]) => {
    return transactions.filter((t) => {
      // Date filter
      if (dateInterval) {
        const txDate = new Date(t.date_string)
        if (!isWithinInterval(txDate, dateInterval)) return false
      }

      // Income/Expense filter
      const amount = t.amount_number
      if (!showIncome && !showExpenses) return false
      if (showIncome && !showExpenses && amount >= 0) return false
      if (!showIncome && showExpenses && amount < 0) return false

      // Uncategorized filter
      if (showOnlyUncategorized !== undefined && showOnlyUncategorized) {
        if (t.category || t.subcategory) return false
      }

      // Excluded categories
      if (t.categoryId && excludedCategoryIds.has(t.categoryId)) return false

      // Category/Subcategory filter (include)
      if (selectedCategoryIds.size > 0) {
        if (!t.categoryId || !selectedCategoryIds.has(t.categoryId)) return false
      }
      if (selectedSubcategoryIds.size > 0) {
        if (!t.subcategoryId || !selectedSubcategoryIds.has(t.subcategoryId)) return false
      }

      // Tag filter
      if (selectedTagIds && selectedTagIds.size > 0) {
        if (!t.tags || t.tags.length === 0) return false
        if (!t.tags.some((tag) => selectedTagIds.has(tag.id))) return false
      }

      // Account filter
      if (selectedAccountIds && selectedAccountIds.size > 0) {
        if (!t.accountId || !selectedAccountIds.has(t.accountId)) return false
      }

      // Search filter
      if (searchQuery !== undefined && searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const tagNames = t.tags?.map((tag) => tag.name).join(' ') || ''
        const searchableText = [
          t.name,
          t.merchantName,
          t.category?.name,
          t.subcategory?.name,
          t.account?.name,
          t.isoCurrencyCode,
          t.amount_number?.toString(),
          t.notes,
          tagNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(query)) return false
      }

      return true
    })
  }

  // Clear all filters
  const clearAllFilters = () => {
    setDateRange(defaultDateRange)
    setCustomStartDate('')
    setCustomEndDate('')
    setSelectedCategoryIds(new Set())
    setSelectedSubcategoryIds(new Set())
    setShowIncome(defaultShowIncome)
    setShowExpenses(defaultShowExpenses)

    // Optional filters
    if (searchQuery !== undefined) setSearchQuery('')
    if (selectedTagIds !== undefined) setSelectedTagIds(new Set())
    if (showOnlyUncategorized !== undefined) setShowOnlyUncategorized(false)
    if (selectedAccountIds !== undefined) setSelectedAccountIds(new Set())

    // Reset to default exclusions
    if (excludeTransfersByDefault) {
      const transfersCategory = categories.find((c) => c.name === '🔁 Transfers')
      if (transfersCategory) {
        setExcludedCategoryIds(new Set([transfersCategory.id]))
      } else {
        setExcludedCategoryIds(new Set())
      }
    } else {
      setExcludedCategoryIds(new Set())
    }
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const defaultExcludedIds = (() => {
      if (!excludeTransfersByDefault) return new Set()
      const transfersCategory = categories.find((c) => c.name === '🔁 Transfers')
      return transfersCategory ? new Set([transfersCategory.id]) : new Set()
    })()

    const hasNonDefaultExclusions =
      excludedCategoryIds.size !== defaultExcludedIds.size ||
      Array.from(excludedCategoryIds).some((id) => !defaultExcludedIds.has(id))

    const baseFilters =
      dateRange !== defaultDateRange ||
      selectedCategoryIds.size > 0 ||
      selectedSubcategoryIds.size > 0 ||
      hasNonDefaultExclusions ||
      showIncome !== defaultShowIncome ||
      showExpenses !== defaultShowExpenses

    const optionalFilters =
      (searchQuery !== undefined && searchQuery.trim() !== '') ||
      (selectedTagIds !== undefined && selectedTagIds.size > 0) ||
      (showOnlyUncategorized !== undefined && showOnlyUncategorized) ||
      (selectedAccountIds !== undefined && selectedAccountIds.size > 0)

    return baseFilters || optionalFilters
  }, [
    dateRange,
    selectedCategoryIds,
    selectedSubcategoryIds,
    excludedCategoryIds,
    showIncome,
    showExpenses,
    searchQuery,
    selectedTagIds,
    showOnlyUncategorized,
    categories,
    defaultDateRange,
    defaultShowIncome,
    defaultShowExpenses,
    excludeTransfersByDefault,
  ])

  return {
    // State
    dateRange,
    customStartDate,
    customEndDate,
    selectedCategoryIds,
    selectedSubcategoryIds,
    excludedCategoryIds,
    showIncome,
    showExpenses,
    showCategoryDropdown,
    dateInterval,
    hasActiveFilters,

    // Setters
    setDateRange,
    setCustomStartDate,
    setCustomEndDate,
    setSelectedCategoryIds,
    setSelectedSubcategoryIds,
    setExcludedCategoryIds,
    setShowIncome,
    setShowExpenses,
    setShowCategoryDropdown,

    // Optional state (conditional returns)
    ...(searchQuery !== undefined && {
      searchQuery,
      setSearchQuery: setSearchQuery as (query: string) => void,
    }),
    ...(selectedTagIds !== undefined && {
      selectedTagIds,
      setSelectedTagIds: setSelectedTagIds as (tagIds: Set<string>) => void,
    }),
    ...(showOnlyUncategorized !== undefined && {
      showOnlyUncategorized,
      setShowOnlyUncategorized: setShowOnlyUncategorized as (show: boolean) => void,
    }),
    ...(selectedAccountIds !== undefined && {
      selectedAccountIds,
      setSelectedAccountIds: setSelectedAccountIds as (accountIds: Set<string>) => void,
    }),

    // Methods
    filterTransactions,
    clearAllFilters,
  }
}
