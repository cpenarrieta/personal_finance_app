"use client"

import { RefObject, useMemo } from "react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TagSelector } from "@/components/transactions/filters/TagSelector"
import type { CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"
import type { DateRange } from "@/hooks/useTransactionFilters"
import type { SortField, SortDirection } from "@/hooks/useTransactionSort"
import { sortCategoriesByGroupAndOrder } from "@/lib/utils"

interface TransactionListFiltersProps {
  categories: CategoryForClient[]
  tags: TagForClient[]
  accounts: PlaidAccountForClient[]
  filters: {
    dateRange: DateRange
    setDateRange: (range: DateRange) => void
    customStartDate: string
    customEndDate: string
    setCustomStartDate: (date: string) => void
    setCustomEndDate: (date: string) => void
    selectedCategoryIds: Set<string>
    setSelectedCategoryIds: (ids: Set<string>) => void
    selectedSubcategoryIds: Set<string>
    setSelectedSubcategoryIds: (ids: Set<string>) => void
    excludedCategoryIds: Set<string>
    setExcludedCategoryIds: (ids: Set<string>) => void
    showIncome: boolean
    setShowIncome: (show: boolean) => void
    showExpenses: boolean
    setShowExpenses: (show: boolean) => void
    showTransfers: boolean
    setShowTransfers: (show: boolean) => void
    showInvestments: boolean
    setShowInvestments: (show: boolean) => void
    showOnlyUncategorized?: boolean
    setShowOnlyUncategorized?: (show: boolean) => void
    selectedTagIds?: Set<string>
    setSelectedTagIds?: (ids: Set<string>) => void
    selectedAccountIds?: Set<string>
    setSelectedAccountIds?: (ids: Set<string>) => void
    showCategoryDropdown: boolean
    setShowCategoryDropdown: (show: boolean) => void
    hasActiveFilters: boolean
    clearAllFilters: () => void
  }
  sort: {
    sortBy: SortField
    setSortBy: (by: SortField) => void
    sortDirection: SortDirection
    setSortDirection: (direction: SortDirection) => void
  }
  dropdownRef: RefObject<HTMLDivElement | null>
  onClearLocalSearch: () => void
}

/**
 * Transaction list filter controls
 * Handles date range, category/subcategory selection, tags, accounts, and sort options
 */
export function TransactionListFilters({
  categories,
  tags,
  accounts,
  filters,
  sort,
  dropdownRef,
  onClearLocalSearch,
}: TransactionListFiltersProps) {
  const sortedCategories = useMemo(() => sortCategoriesByGroupAndOrder(categories), [categories])

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(filters.selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      // Also remove all subcategories of this category
      const category = categories.find((c) => c.id === categoryId)
      if (category?.subcategories) {
        const newSubSelected = new Set(filters.selectedSubcategoryIds)
        category.subcategories.forEach((sub) => newSubSelected.delete(sub.id))
        filters.setSelectedSubcategoryIds(newSubSelected)
      }
    } else {
      newSelected.add(categoryId)
    }
    filters.setSelectedCategoryIds(newSelected)
  }

  const toggleSubcategory = (subcategoryId: string, categoryId: string) => {
    const newSubSelected = new Set(filters.selectedSubcategoryIds)
    if (newSubSelected.has(subcategoryId)) {
      newSubSelected.delete(subcategoryId)
    } else {
      newSubSelected.add(subcategoryId)
      // Ensure parent category is selected
      if (!filters.selectedCategoryIds.has(categoryId)) {
        const newSelected = new Set(filters.selectedCategoryIds)
        newSelected.add(categoryId)
        filters.setSelectedCategoryIds(newSelected)
      }
    }
    filters.setSelectedSubcategoryIds(newSubSelected)
  }

  const toggleExcludedCategory = (categoryId: string) => {
    const newExcluded = new Set(filters.excludedCategoryIds)
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId)
    } else {
      newExcluded.add(categoryId)
    }
    filters.setExcludedCategoryIds(newExcluded)
  }

  const toggleTag = (tagId: string) => {
    if (!filters.selectedTagIds || !filters.setSelectedTagIds) return
    const newSelected = new Set(filters.selectedTagIds)
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId)
    } else {
      newSelected.add(tagId)
    }
    filters.setSelectedTagIds(newSelected)
  }

  const toggleAccount = (accountId: string) => {
    if (!filters.selectedAccountIds || !filters.setSelectedAccountIds) return
    const newSelected = new Set(filters.selectedAccountIds)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    filters.setSelectedAccountIds(newSelected)
  }

  const handleClearAllFilters = () => {
    onClearLocalSearch()
    filters.clearAllFilters()
  }

  // Helper to parse dates at midnight local time
  const parseLocalDate = (dateStr: string) => {
    const parts = dateStr.split("-").map(Number)
    return new Date(parts[0]!, parts[1]! - 1, parts[2]!)
  }

  // Helper to format date to yyyy-MM-dd in local timezone
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return (
    <div className="bg-card p-3 md:p-4 rounded-lg shadow-sm border space-y-3 md:space-y-4">
      {/* Primary Filters Row */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* Date Range */}
        <Select value={filters.dateRange} onValueChange={(value) => filters.setDateRange(value as DateRange)}>
          <SelectTrigger className="w-[140px] md:w-[160px] text-sm md:text-base">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="last90">Last 90 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {filters.dateRange === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full md:w-[280px] justify-start text-left font-normal text-sm md:text-base"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {filters.customStartDate && filters.customEndDate
                  ? `${format(parseLocalDate(filters.customStartDate), "PP")} - ${format(parseLocalDate(filters.customEndDate), "PP")}`
                  : filters.customStartDate
                    ? `${format(parseLocalDate(filters.customStartDate), "PP")} - End date`
                    : "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  filters.customStartDate || filters.customEndDate
                    ? {
                        from: filters.customStartDate ? parseLocalDate(filters.customStartDate) : undefined,
                        to: filters.customEndDate ? parseLocalDate(filters.customEndDate) : undefined,
                      }
                    : undefined
                }
                onSelect={(range) => {
                  filters.setCustomStartDate(range?.from ? formatLocalDate(range.from) : "")
                  filters.setCustomEndDate(range?.to ? formatLocalDate(range.to) : "")
                }}
                numberOfMonths={2}
                weekStartsOn={1}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Account Filter */}
        {accounts.length > 0 && (
          <Select
            value={
              filters.selectedAccountIds && filters.selectedAccountIds.size === 1
                ? Array.from(filters.selectedAccountIds)[0]
                : "all"
            }
            onValueChange={(value) => {
              if (value === "all") {
                filters.setSelectedAccountIds?.(new Set())
              } else {
                filters.setSelectedAccountIds?.(new Set([value]))
              }
            }}
          >
            <SelectTrigger className="w-[140px] md:w-[180px] text-sm md:text-base">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} {account.mask ? `(•••${account.mask})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Category/Subcategory Multi-select */}
        <div className="relative" ref={dropdownRef as RefObject<HTMLDivElement>}>
          <Button
            variant="outline"
            onClick={() => filters.setShowCategoryDropdown(!filters.showCategoryDropdown)}
            size="sm"
            className="md:h-10 text-sm md:text-base"
          >
            <span>Select Categories...</span>
            <svg className="h-4 w-4 ml-1 md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Dropdown Menu */}
          {filters.showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-3">
                <div className="mb-3 pb-3 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Include Categories</h4>
                  {sortedCategories.map((category) => (
                    <div key={category.id} className="mb-2">
                      <label className="flex items-center p-2 hover:bg-muted rounded cursor-pointer">
                        <Checkbox
                          checked={filters.selectedCategoryIds.has(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <span className="ml-2 text-sm font-medium text-foreground">{category.name}</span>
                      </label>
                      {category.subcategories &&
                        category.subcategories.length > 0 &&
                        filters.selectedCategoryIds.has(category.id) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {category.subcategories.map((sub) => (
                              <label
                                key={sub.id}
                                className="flex items-center p-1 hover:bg-muted rounded cursor-pointer"
                              >
                                <Checkbox
                                  checked={filters.selectedSubcategoryIds.has(sub.id)}
                                  onCheckedChange={() => toggleSubcategory(sub.id, category.id)}
                                />
                                <span className="ml-2 text-sm text-muted-foreground">{sub.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Exclude Categories</h4>
                  {sortedCategories.map((category) => (
                    <label key={category.id} className="flex items-center p-2 hover:bg-muted rounded cursor-pointer">
                      <Checkbox
                        checked={filters.excludedCategoryIds.has(category.id)}
                        onCheckedChange={() => toggleExcludedCategory(category.id)}
                      />
                      <span className="ml-2 text-sm text-foreground">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="w-full md:w-auto md:ml-auto flex items-center gap-2">
          <span className="text-xs md:text-sm text-muted-foreground">Sort:</span>
          <Select value={sort.sortBy} onValueChange={(value) => sort.setSortBy(value as SortField)}>
            <SelectTrigger className="flex-1 md:w-[160px] text-sm md:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Transaction Date</SelectItem>
              <SelectItem value="createdAt">Creation Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="merchant">Merchant</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => sort.setSortDirection(sort.sortDirection === "asc" ? "desc" : "asc")}
            title={sort.sortDirection === "asc" ? "Ascending" : "Descending"}
            className="h-9 w-9 md:h-10 md:w-10"
          >
            {sort.sortDirection === "asc" ? (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {/* Secondary Filters Row - Type, Tags, Uncategorized */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-3 border-t">
        {/* Income/Expense/Transfer Toggles */}
        <div className="flex items-center gap-3 md:gap-4">
          <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showIncome}
              onCheckedChange={(checked) => filters.setShowIncome(checked === true)}
            />
            <span className="text-xs md:text-sm text-muted-foreground">Income</span>
          </label>

          <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showExpenses}
              onCheckedChange={(checked) => filters.setShowExpenses(checked === true)}
            />
            <span className="text-xs md:text-sm text-muted-foreground">Expenses</span>
          </label>

          <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showTransfers}
              onCheckedChange={(checked) => filters.setShowTransfers(checked === true)}
            />
            <span className="text-xs md:text-sm text-muted-foreground">Transfers</span>
          </label>

          <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
            <Checkbox
              checked={filters.showInvestments}
              onCheckedChange={(checked) => filters.setShowInvestments(checked === true)}
            />
            <span className="text-xs md:text-sm text-muted-foreground">Investments</span>
          </label>
        </div>

        {/* Uncategorized Checkbox */}
        <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
          <Checkbox
            checked={filters.showOnlyUncategorized || false}
            onCheckedChange={(checked) => filters.setShowOnlyUncategorized?.(checked === true)}
          />
          <span className="text-xs md:text-sm text-muted-foreground">Uncategorized</span>
        </label>

        {/* Tag Filter - Full width on mobile */}
        {tags.length > 0 && (
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-xs md:text-sm text-muted-foreground flex-shrink-0">Tags:</span>
            <div className="flex-1 md:flex-initial">
              <TagSelector
                tags={tags}
                selectedTagIds={Array.from(filters.selectedTagIds || [])}
                onToggleTag={toggleTag}
                label=""
                showManageLink={false}
              />
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {filters.hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllFilters}
            className="w-full md:w-auto md:ml-auto text-sm"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips
        categories={categories}
        tags={tags}
        accounts={accounts}
        filters={filters}
        onToggleCategory={toggleCategory}
        onToggleSubcategory={toggleSubcategory}
        onToggleExcludedCategory={toggleExcludedCategory}
        onToggleTag={toggleTag}
        onToggleAccount={toggleAccount}
      />
    </div>
  )
}

interface ActiveFilterChipsProps {
  categories: CategoryForClient[]
  tags: TagForClient[]
  accounts: PlaidAccountForClient[]
  filters: {
    selectedCategoryIds: Set<string>
    selectedSubcategoryIds: Set<string>
    excludedCategoryIds: Set<string>
    selectedTagIds?: Set<string>
    selectedAccountIds?: Set<string>
  }
  onToggleCategory: (id: string) => void
  onToggleSubcategory: (subId: string, catId: string) => void
  onToggleExcludedCategory: (id: string) => void
  onToggleTag: (id: string) => void
  onToggleAccount: (id: string) => void
}

function ActiveFilterChips({
  categories,
  tags,
  accounts,
  filters,
  onToggleCategory,
  onToggleSubcategory,
  onToggleExcludedCategory,
  onToggleTag,
  onToggleAccount,
}: ActiveFilterChipsProps) {
  const hasActiveChips =
    filters.selectedCategoryIds.size > 0 ||
    filters.selectedSubcategoryIds.size > 0 ||
    filters.excludedCategoryIds.size > 0 ||
    (filters.selectedTagIds && filters.selectedTagIds.size > 0) ||
    (filters.selectedAccountIds && filters.selectedAccountIds.size > 0)

  if (!hasActiveChips) return null

  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t">
      {Array.from(filters.selectedCategoryIds).map((catId) => {
        const category = categories.find((c) => c.id === catId)
        if (!category) return null
        return (
          <Badge key={catId} variant="secondary" className="inline-flex items-center gap-1 bg-primary/10 text-primary">
            ✓ {category.name}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleCategory(catId)}
              className="h-auto p-0.5 hover:bg-primary/20"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </Badge>
        )
      })}
      {Array.from(filters.selectedSubcategoryIds).map((subId) => {
        const category = categories.find((c) => c.subcategories?.some((s) => s.id === subId))
        const subcategory = category?.subcategories?.find((s) => s.id === subId)
        if (!subcategory || !category) return null
        return (
          <Badge
            key={subId}
            variant="secondary"
            className="inline-flex items-center gap-1 bg-secondary/20 text-secondary-foreground"
          >
            ✓ {subcategory.name}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSubcategory(subId, category.id)}
              className="h-auto p-0.5 hover:bg-secondary/30"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </Badge>
        )
      })}
      {Array.from(filters.excludedCategoryIds).map((catId) => {
        const category = categories.find((c) => c.id === catId)
        if (!category) return null
        return (
          <Badge
            key={`excluded-${catId}`}
            variant="secondary"
            className="inline-flex items-center gap-1 bg-destructive/10 text-destructive"
          >
            ✕ {category.name}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExcludedCategory(catId)}
              className="h-auto p-0.5 hover:bg-destructive/20"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </Badge>
        )
      })}
      {filters.selectedTagIds &&
        Array.from(filters.selectedTagIds).map((tagId) => {
          const tag = tags.find((t) => t.id === tagId)
          if (!tag) return null
          return (
            <Badge
              key={`tag-${tagId}`}
              className="inline-flex items-center gap-1 text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleTag(tagId)}
                className="h-auto p-0.5 hover:bg-black hover:bg-opacity-20"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </Badge>
          )
        })}
      {filters.selectedAccountIds &&
        Array.from(filters.selectedAccountIds).map((accountId) => {
          const account = accounts.find((a) => a.id === accountId)
          if (!account) return null
          return (
            <Badge
              key={`account-${accountId}`}
              variant="secondary"
              className="inline-flex items-center gap-1 bg-primary/10 text-primary"
            >
              {account.name} {account.mask ? `(•••${account.mask})` : ""}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAccount(accountId)}
                className="h-auto p-0.5 hover:bg-primary/20"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </Badge>
          )
        })}
    </div>
  )
}
