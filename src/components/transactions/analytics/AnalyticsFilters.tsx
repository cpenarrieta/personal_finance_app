"use client"

import { RefObject, useMemo } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CategoryForClient } from "@/types/client"
import { sortCategoriesByGroupAndOrder } from "@/lib/utils"

type DateRange = "all" | "last30" | "last90" | "thisMonth" | "lastMonth" | "custom"

interface AnalyticsFiltersProps {
  categories: CategoryForClient[]
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  customStartDate: string
  customEndDate: string
  setCustomStartDate: (date: string) => void
  setCustomEndDate: (date: string) => void
  selectedCategoryIds: Set<string>
  selectedSubcategoryIds: Set<string>
  excludedCategoryIds: Set<string>
  showCategoryDropdown: boolean
  setShowCategoryDropdown: (show: boolean) => void
  showIncome: boolean
  setShowIncome: (show: boolean) => void
  showExpenses: boolean
  setShowExpenses: (show: boolean) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  onToggleCategory: (categoryId: string) => void
  onToggleSubcategory: (subcategoryId: string, categoryId: string) => void
  onToggleExcludedCategory: (categoryId: string) => void
  dropdownRef: RefObject<HTMLDivElement>
}

/**
 * Filter controls for transaction analytics
 */
export function AnalyticsFilters({
  categories,
  dateRange,
  setDateRange,
  customStartDate,
  customEndDate,
  setCustomStartDate,
  setCustomEndDate,
  selectedCategoryIds,
  selectedSubcategoryIds,
  excludedCategoryIds,
  showCategoryDropdown,
  setShowCategoryDropdown,
  showIncome,
  setShowIncome,
  showExpenses,
  setShowExpenses,
  hasActiveFilters,
  onClearFilters,
  onToggleCategory,
  onToggleSubcategory,
  onToggleExcludedCategory,
  dropdownRef,
}: AnalyticsFiltersProps) {
  const sortedCategories = useMemo(() => sortCategoriesByGroupAndOrder(categories), [categories])

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex-shrink-0">
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
            <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Custom Date Range */}
        {dateRange === "custom" && (
          <>
            <div className="flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {customStartDate ? format(new Date(customStartDate), "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate ? new Date(customStartDate) : undefined}
                    onSelect={(date) => setCustomStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {customEndDate ? format(new Date(customEndDate), "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate ? new Date(customEndDate) : undefined}
                    onSelect={(date) => setCustomEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* Category/Subcategory Multi-select */}
        <div className="flex-shrink-0 relative" ref={dropdownRef as RefObject<HTMLDivElement>}>
          <Button variant="outline" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}>
            <span>Select Categories...</span>
            <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Dropdown Menu */}
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-3">
                <div className="mb-3 pb-3 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Include Categories</h4>
                  {sortedCategories.map((category) => (
                    <div key={category.id} className="mb-2">
                      <label className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox
                          checked={selectedCategoryIds.has(category.id)}
                          onCheckedChange={() => onToggleCategory(category.id)}
                        />
                        <span className="ml-2 text-sm font-medium text-foreground">{category.name}</span>
                      </label>
                      {category.subcategories?.length &&
                        category.subcategories?.length > 0 &&
                        selectedCategoryIds.has(category.id) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {category.subcategories?.map((sub) => (
                              <label
                                key={sub.id}
                                className="flex items-center p-1 hover:bg-muted/50 rounded cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedSubcategoryIds.has(sub.id)}
                                  onCheckedChange={() => onToggleSubcategory(sub.id, category.id)}
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
                    <label
                      key={category.id}
                      className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={excludedCategoryIds.has(category.id)}
                        onCheckedChange={() => onToggleExcludedCategory(category.id)}
                      />
                      <span className="ml-2 text-sm text-foreground">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Income Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Checkbox
            id="income-toggle-analytics"
            checked={showIncome}
            onCheckedChange={(checked) => setShowIncome(checked === true)}
          />
          <Label htmlFor="income-toggle-analytics" className="cursor-pointer">
            Income
          </Label>
        </div>

        {/* Expenses Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Checkbox
            id="expenses-toggle-analytics"
            checked={showExpenses}
            onCheckedChange={(checked) => setShowExpenses(checked === true)}
          />
          <Label htmlFor="expenses-toggle-analytics" className="cursor-pointer">
            Expenses
          </Label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Selected Filter Chips */}
      <AnalyticsFilterChips
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        selectedSubcategoryIds={selectedSubcategoryIds}
        excludedCategoryIds={excludedCategoryIds}
        onToggleCategory={onToggleCategory}
        onToggleSubcategory={onToggleSubcategory}
        onToggleExcludedCategory={onToggleExcludedCategory}
      />
    </div>
  )
}

interface AnalyticsFilterChipsProps {
  categories: CategoryForClient[]
  selectedCategoryIds: Set<string>
  selectedSubcategoryIds: Set<string>
  excludedCategoryIds: Set<string>
  onToggleCategory: (categoryId: string) => void
  onToggleSubcategory: (subcategoryId: string, categoryId: string) => void
  onToggleExcludedCategory: (categoryId: string) => void
}

function AnalyticsFilterChips({
  categories,
  selectedCategoryIds,
  selectedSubcategoryIds,
  excludedCategoryIds,
  onToggleCategory,
  onToggleSubcategory,
  onToggleExcludedCategory,
}: AnalyticsFilterChipsProps) {
  if (selectedCategoryIds.size === 0 && selectedSubcategoryIds.size === 0 && excludedCategoryIds.size === 0) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {Array.from(selectedCategoryIds).map((catId) => {
        const category = categories.find((c) => c.id === catId)
        if (!category) return null
        return (
          <span
            key={catId}
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
          >
            ✓ {category.name}
            <button onClick={() => onToggleCategory(catId)} className="hover:bg-primary/20 rounded-full p-0.5">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )
      })}
      {Array.from(selectedSubcategoryIds).map((subId) => {
        const category = categories.find((c) => c.subcategories?.some((s) => s.id === subId))
        const subcategory = category?.subcategories?.find((s) => s.id === subId)
        if (!subcategory || !category) return null
        return (
          <span
            key={subId}
            className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/20 text-secondary-foreground rounded-full text-sm"
          >
            ✓ {subcategory.name}
            <button
              onClick={() => onToggleSubcategory(subId, category.id)}
              className="hover:bg-secondary/30 rounded-full p-0.5"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )
      })}
      {Array.from(excludedCategoryIds).map((catId) => {
        const category = categories.find((c) => c.id === catId)
        if (!category) return null
        return (
          <span
            key={`excluded-${catId}`}
            className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm"
          >
            ✕ {category.name}
            <button
              onClick={() => onToggleExcludedCategory(catId)}
              className="hover:bg-destructive/20 rounded-full p-0.5"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )
      })}
    </div>
  )
}
