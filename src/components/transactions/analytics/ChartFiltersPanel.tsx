"use client"

import { RefObject, useRef, useState, useMemo } from "react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CategoryForClient } from "@/types"
import { sortCategoriesByGroupAndOrder } from "@/lib/utils"
import { useClickOutside } from "@/hooks/useClickOutside"
import type { DateRange } from "@/hooks/useTransactionFilters"

interface ChartFiltersPanelProps {
  categories: CategoryForClient[]
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  customStartDate: string
  setCustomStartDate: (date: string) => void
  customEndDate: string
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
  hasActiveFilters: boolean
  clearAllFilters: () => void
  disabled?: boolean
}

export function ChartFiltersPanel({
  categories,
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedCategoryIds,
  setSelectedCategoryIds,
  selectedSubcategoryIds,
  setSelectedSubcategoryIds,
  excludedCategoryIds,
  setExcludedCategoryIds,
  showIncome,
  setShowIncome,
  showExpenses,
  setShowExpenses,
  hasActiveFilters,
  clearAllFilters,
  disabled = false,
}: ChartFiltersPanelProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // Sort categories by group type and display order
  const sortedCategories = useMemo(
    () => sortCategoriesByGroupAndOrder(categories),
    [categories]
  )

  // Close dropdown when clicking outside
  useClickOutside(
    dropdownRef as RefObject<HTMLElement>,
    () => setShowCategoryDropdown(false),
    showCategoryDropdown
  )

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      const category = categories.find((c) => c.id === categoryId)
      if (category) {
        const newSelectedSubs = new Set(selectedSubcategoryIds)
        category.subcategories?.forEach((sub) => newSelectedSubs.delete(sub.id))
        setSelectedSubcategoryIds(newSelectedSubs)
      }
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategoryIds(newSelected)
  }

  // Toggle subcategory selection
  const toggleSubcategory = (subcategoryId: string, categoryId: string) => {
    const newSelected = new Set(selectedSubcategoryIds)
    if (newSelected.has(subcategoryId)) {
      newSelected.delete(subcategoryId)
    } else {
      newSelected.add(subcategoryId)
      if (!selectedCategoryIds.has(categoryId)) {
        setSelectedCategoryIds(new Set(selectedCategoryIds).add(categoryId))
      }
    }
    setSelectedSubcategoryIds(newSelected)
  }

  // Toggle excluded category
  const toggleExcludedCategory = (categoryId: string) => {
    const newExcluded = new Set(excludedCategoryIds)
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId)
    } else {
      newExcluded.add(categoryId)
    }
    setExcludedCategoryIds(newExcluded)
  }

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm border relative">
      {disabled && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning-foreground">
            Filters disabled for this chart
          </span>
        </div>
      )}
      <div
        className={`flex flex-wrap items-center gap-4 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        {/* Date Range */}
        <div className="flex-shrink-0">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRange)}
            disabled={disabled}
          >
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
                  <Button
                    variant="outline"
                    className="w-[180px] justify-start text-left font-normal"
                    disabled={disabled}
                  >
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
                  <Button
                    variant="outline"
                    className="w-[180px] justify-start text-left font-normal"
                    disabled={disabled}
                  >
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
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <Button
            variant="outline"
            onClick={() => !disabled && setShowCategoryDropdown(!showCategoryDropdown)}
            disabled={disabled}
          >
            <span>Categories...</span>
            <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Dropdown Menu */}
          {showCategoryDropdown && !disabled && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
              <div className="p-3">
                <div className="mb-3 pb-3 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Include Categories
                  </h4>
                  {sortedCategories.map((category) => (
                    <div key={category.id} className="mb-2">
                      <label className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <Checkbox
                          checked={selectedCategoryIds.has(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
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
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Exclude Categories
                  </h4>
                  {sortedCategories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center p-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={excludedCategoryIds.has(category.id)}
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

        {/* Income Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            id="income-toggle"
            checked={showIncome}
            onCheckedChange={setShowIncome}
            disabled={disabled}
          />
          <Label htmlFor="income-toggle" className="cursor-pointer">
            Income
          </Label>
        </div>

        {/* Expenses Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            id="expenses-toggle"
            checked={showExpenses}
            onCheckedChange={setShowExpenses}
            disabled={disabled}
          />
          <Label htmlFor="expenses-toggle" className="cursor-pointer">
            Expenses
          </Label>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && !disabled && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Selected Filter Chips */}
      {!disabled &&
        (selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selectedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId)
              if (!category) return null
              return (
                <Badge
                  key={catId}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/10"
                >
                  ✓ {category.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCategory(catId)}
                    className="h-auto p-0.5 hover:bg-primary/20"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              )
            })}
            {Array.from(selectedSubcategoryIds).map((subId) => {
              const category = categories.find((c) => c.subcategories?.some((s) => s.id === subId))
              const subcategory = category?.subcategories?.find((s) => s.id === subId)
              if (!subcategory || !category) return null
              return (
                <Badge
                  key={subId}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-primary/20 text-primary hover:bg-primary/20"
                >
                  ✓ {subcategory.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSubcategory(subId, category.id)}
                    className="h-auto p-0.5 hover:bg-primary/30"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              )
            })}
            {Array.from(excludedCategoryIds).map((catId) => {
              const category = categories.find((c) => c.id === catId)
              if (!category) return null
              return (
                <Badge
                  key={`excluded-${catId}`}
                  variant="secondary"
                  className="inline-flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10"
                >
                  ✕ {category.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExcludedCategory(catId)}
                    className="h-auto p-0.5 hover:bg-destructive/20"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}
    </div>
  )
}
