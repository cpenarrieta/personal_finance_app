"use client"

import { useMemo, useEffect, useRef, RefObject, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { TransactionSearchBar } from "@/components/transactions/list/TransactionSearchBar"
import { TransactionListFilters } from "@/components/transactions/list/TransactionListFilters"
import { TransactionSummaryCards } from "@/components/transactions/list/TransactionSummaryCards"
import { TransactionListContent } from "@/components/transactions/list/TransactionListContent"
import type { TransactionForClient, CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params"
import { useClickOutside } from "@/hooks/useClickOutside"
import { useDebounce } from "@/hooks/useDebounce"
import { useTransactionFilters } from "@/hooks/useTransactionFilters"
import { useTransactionSort } from "@/hooks/useTransactionSort"
import { useBulkTransactionOperations } from "@/hooks/useBulkTransactionOperations"
import { transactionFiltersToUrlParams } from "@/lib/transactions/url-params"

interface SearchableTransactionListProps {
  transactions: TransactionForClient[]
  showAccount?: boolean
  categories: CategoryForClient[]
  tags: TagForClient[]
  accounts?: PlaidAccountForClient[]
  initialFilters?: TransactionFiltersFromUrl
  onFilteredTransactionsChange?: (transactionIds: string[]) => void
}

/**
 * Main transaction list component with search, filters, and bulk operations
 *
 * This component orchestrates:
 * - Search functionality with debouncing
 * - Filter state management and URL sync
 * - Transaction sorting and filtering
 * - Bulk update operations
 */
export function SearchableTransactionList({
  transactions,
  showAccount = true,
  categories,
  tags,
  accounts = [],
  initialFilters,
  onFilteredTransactionsChange,
}: SearchableTransactionListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const nonInvestmentAccounts = accounts.filter((account) => account.type !== "investment")

  // Local state for immediate search input (responsive UI)
  const [localSearchQuery, setLocalSearchQuery] = useState(initialFilters?.searchQuery ?? "")

  // Debounce the search query (300ms delay)
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300)

  // Use hooks with initial values from URL
  const filters = useTransactionFilters({
    categories,
    tags,
    accounts: nonInvestmentAccounts,
    defaultDateRange: initialFilters?.dateRange ?? "all",
    defaultShowIncome: initialFilters?.showIncome ?? true,
    defaultShowExpenses: initialFilters?.showExpenses ?? true,
    excludeTransfersByDefault: false,
    enableSearch: true,
    enableTagFilter: true,
    enableUncategorizedFilter: true,
    enableAccountFilter: true,
    initialSelectedCategoryIds: initialFilters?.selectedCategoryIds,
    initialSelectedSubcategoryIds: initialFilters?.selectedSubcategoryIds,
    initialExcludedCategoryIds: initialFilters?.excludedCategoryIds,
    initialCustomStartDate: initialFilters?.customStartDate,
    initialCustomEndDate: initialFilters?.customEndDate,
    initialSearchQuery: initialFilters?.searchQuery,
    initialSelectedTagIds: initialFilters?.selectedTagIds,
    initialShowOnlyUncategorized: initialFilters?.showOnlyUncategorized,
    initialSelectedAccountIds: initialFilters?.selectedAccountIds,
  })

  const sort = useTransactionSort({
    defaultSortBy: (initialFilters?.sortBy as "date" | "createdAt" | "amount" | "name" | "merchant") ?? "date",
    defaultSortDirection: initialFilters?.sortDirection ?? "desc",
  })

  const bulk = useBulkTransactionOperations()

  // Sync debounced search query to filters
  useEffect(() => {
    filters.setSearchQuery?.(debouncedSearchQuery)
  }, [debouncedSearchQuery])

  // Sync filters.searchQuery to local state (for browser back/forward navigation)
  useEffect(() => {
    if (
      filters.searchQuery !== undefined &&
      filters.searchQuery !== localSearchQuery &&
      filters.searchQuery !== debouncedSearchQuery
    ) {
      setLocalSearchQuery(filters.searchQuery)
    }
  }, [filters.searchQuery])

  // Sync filters to URL
  useEffect(() => {
    const params = transactionFiltersToUrlParams({
      dateRange: filters.dateRange,
      customStartDate: filters.customStartDate,
      customEndDate: filters.customEndDate,
      selectedCategoryIds: filters.selectedCategoryIds,
      selectedSubcategoryIds: filters.selectedSubcategoryIds,
      excludedCategoryIds: filters.excludedCategoryIds,
      showIncome: filters.showIncome,
      showExpenses: filters.showExpenses,
      showTransfers: filters.showTransfers,
      showInvestments: filters.showInvestments,
      searchQuery: filters.searchQuery,
      selectedTagIds: filters.selectedTagIds,
      showOnlyUncategorized: filters.showOnlyUncategorized,
      selectedAccountIds: filters.selectedAccountIds,
      sortBy: sort.sortBy,
      sortDirection: sort.sortDirection,
    })

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [
    filters.dateRange,
    filters.customStartDate,
    filters.customEndDate,
    filters.selectedCategoryIds,
    filters.selectedSubcategoryIds,
    filters.excludedCategoryIds,
    filters.showIncome,
    filters.showExpenses,
    filters.showTransfers,
    filters.showInvestments,
    filters.searchQuery,
    filters.selectedTagIds,
    filters.showOnlyUncategorized,
    filters.selectedAccountIds,
    sort.sortBy,
    sort.sortDirection,
    pathname,
    router,
    searchParams,
  ])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const filtered = filters.filterTransactions(transactions)
    return sort.sortTransactions(filtered)
  }, [
    transactions,
    filters.dateRange,
    filters.customStartDate,
    filters.customEndDate,
    filters.selectedCategoryIds,
    filters.selectedSubcategoryIds,
    filters.excludedCategoryIds,
    filters.showIncome,
    filters.showExpenses,
    filters.showTransfers,
    filters.showInvestments,
    filters.searchQuery,
    filters.selectedTagIds,
    filters.showOnlyUncategorized,
    filters.selectedAccountIds,
    filters.filterTransactions,
    sort.sortBy,
    sort.sortDirection,
    sort.sortTransactions,
  ])

  // Notify parent of filtered transaction IDs for CSV export
  useEffect(() => {
    if (onFilteredTransactionsChange) {
      const ids = filteredTransactions.map((t) => t.id)
      onFilteredTransactionsChange(ids)
    }
  }, [filteredTransactions])

  // Close dropdown when clicking outside
  useClickOutside(
    dropdownRef as RefObject<HTMLElement>,
    () => filters.setShowCategoryDropdown(false),
    filters.showCategoryDropdown,
  )

  // Calculate totals for filtered transactions (using groupType for categorization)
  const totals = useMemo(() => {
    let income = 0
    let expenses = 0
    for (const t of filteredTransactions) {
      if (t.category?.groupType === "INCOME") {
        income += t.amount_number
      } else if (t.category?.groupType === "EXPENSES") {
        expenses += Math.abs(t.amount_number)
      }
    }
    const netBalance = income - expenses

    return { expenses, income, netBalance, count: filteredTransactions.length }
  }, [filteredTransactions])

  return (
    <div className="space-y-4">
      <TransactionSearchBar value={localSearchQuery} onChange={setLocalSearchQuery} />

      <TransactionListFilters
        categories={categories}
        tags={tags}
        accounts={nonInvestmentAccounts}
        filters={filters}
        sort={sort}
        dropdownRef={dropdownRef}
        onClearLocalSearch={() => setLocalSearchQuery("")}
      />

      <TransactionSummaryCards totals={totals} />

      <TransactionListContent
        filteredTransactions={filteredTransactions}
        totalTransactions={transactions.length}
        categories={categories}
        showAccount={showAccount}
        searchQuery={filters.searchQuery}
        bulk={bulk}
      />
    </div>
  )
}
