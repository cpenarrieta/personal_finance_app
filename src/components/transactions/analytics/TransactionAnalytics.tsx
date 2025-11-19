"use client"

import { useState, useMemo, useRef, RefObject } from "react"
import Image from "next/image"
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CategoryForClient, TransactionForClient } from "@/types/client"
import { sortCategoriesByGroupAndOrder, formatAmount } from "@/lib/utils"
import { useClickOutside } from "@/hooks/useClickOutside"
import {
  formatTransactionDate,
  compareTransactionDates,
  isTransactionInDateRange,
  getTransactionMonth,
  formatTransactionMonth,
  dateToString,
} from "@/lib/utils/transaction-date"

interface TransactionAnalyticsProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
}

type DateRange = "all" | "last30" | "last90" | "thisMonth" | "lastMonth" | "custom"

export function TransactionAnalytics({ transactions, categories }: TransactionAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("last30")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showIncome, setShowIncome] = useState(false)
  const [showExpenses, setShowExpenses] = useState(true)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Set default exclusions (🔁 Transfers) on mount
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(() => {
    const transfersCategory = categories.find((cat) => cat.name === "🔁 Transfers")
    return transfersCategory ? new Set([transfersCategory.id]) : new Set()
  })

  // Sort categories by group type and display order
  const sortedCategories = useMemo(() => sortCategoriesByGroupAndOrder(categories), [categories])

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef as RefObject<HTMLElement>, () => setShowCategoryDropdown(false), showCategoryDropdown)

  // No longer needed - we're using the categories from the API

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Calculate date range
    const now = new Date()
    let range: { start: Date; end: Date } | null = null

    switch (dateRange) {
      case "last30":
        range = { start: subMonths(now, 1), end: now }
        break
      case "last90":
        range = { start: subMonths(now, 3), end: now }
        break
      case "thisMonth":
        range = { start: startOfMonth(now), end: endOfMonth(now) }
        break
      case "lastMonth":
        const lastMonth = subMonths(now, 1)
        range = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
        break
      case "custom":
        if (customStartDate && customEndDate) {
          range = {
            start: new Date(customStartDate),
            end: new Date(customEndDate),
          }
        }
        break
      case "all":
      default:
        range = null
    }

    // Date range filter
    if (range) {
      const startStr = dateToString(range.start)
      const endStr = dateToString(range.end)
      filtered = filtered.filter((t) => isTransactionInDateRange(t.datetime, startStr, endStr))
    }

    // Income/Expense filter
    if (!showIncome && !showExpenses) {
      // If neither is selected, show nothing
      return []
    } else if (showIncome && !showExpenses) {
      // Show only income (positive display amounts)
      filtered = filtered.filter((t) => t.amount_number > 0)
    } else if (!showIncome && showExpenses) {
      // Show only expenses (negative display amounts)
      filtered = filtered.filter((t) => t.amount_number < 0)
    }
    // If both are selected, show both (no filter needed)

    // Exclude categories filter
    if (excludedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.categoryId) return true // Keep uncategorized
        return !excludedCategoryIds.has(t.categoryId)
      })
    }

    // Category filter (include)
    if (selectedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.categoryId) return false
        return selectedCategoryIds.has(t.categoryId)
      })
    }

    // Subcategory filter
    if (selectedSubcategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.subcategoryId) return false
        return selectedSubcategoryIds.has(t.subcategoryId)
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "date":
          comparison = compareTransactionDates(a.datetime, b.datetime)
          break
        case "amount":
          comparison = a.amount_number - b.amount_number
          break
        case "category":
          const catA = a.category?.name || ""
          const catB = b.category?.name || ""
          comparison = catA.localeCompare(catB)
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [
    transactions,
    dateRange,
    customStartDate,
    customEndDate,
    selectedCategoryIds,
    selectedSubcategoryIds,
    excludedCategoryIds,
    showIncome,
    showExpenses,
    sortBy,
    sortOrder,
  ])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount_number, 0)
    const expenses = filteredTransactions.filter((t) => t.amount_number < 0)
    const income = filteredTransactions.filter((t) => t.amount_number > 0)

    const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.amount_number, 0))
    const totalIncome = income.reduce((sum, t) => sum + t.amount_number, 0)

    const avgTransaction = filteredTransactions.length > 0 ? total / filteredTransactions.length : 0

    return {
      total,
      totalExpenses,
      totalIncome,
      count: filteredTransactions.length,
      avgTransaction,
    }
  }, [filteredTransactions])

  // Category breakdown data
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number; imageUrl?: string }>()

    filteredTransactions.forEach((t) => {
      const amount = Math.abs(t.amount_number)
      const categoryName = t.category?.name || "Uncategorized"
      const imageUrl = t.category?.imageUrl

      if (categoryMap.has(categoryName)) {
        categoryMap.get(categoryName)!.value += amount
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          value: amount,
          imageUrl: imageUrl || undefined,
        })
      }
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [filteredTransactions])

  // Subcategory breakdown data
  const subcategoryData = useMemo(() => {
    const subcategoryMap = new Map<string, { name: string; value: number; imageUrl?: string }>()

    filteredTransactions.forEach((t) => {
      const amount = Math.abs(t.amount_number)
      const subcategoryName = t.subcategory?.name || "No Subcategory"
      const imageUrl = t.subcategory?.imageUrl

      if (subcategoryMap.has(subcategoryName)) {
        subcategoryMap.get(subcategoryName)!.value += amount
      } else {
        subcategoryMap.set(subcategoryName, {
          name: subcategoryName,
          value: amount,
          imageUrl: imageUrl || undefined,
        })
      }
    })

    return Array.from(subcategoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 subcategories
  }, [filteredTransactions])

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>()

    filteredTransactions.forEach((t) => {
      const monthKey = getTransactionMonth(t.datetime) // YYYY-MM format
      const amount = Math.abs(t.amount_number)

      if (monthMap.has(monthKey)) {
        monthMap.set(monthKey, monthMap.get(monthKey)! + amount)
      } else {
        monthMap.set(monthKey, amount)
      }
    })

    return Array.from(monthMap.entries())
      .map(([monthKey, amount]) => ({ month: formatTransactionMonth(monthKey), amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredTransactions])

  const toggleSort = (field: "date" | "amount" | "category") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      // Also remove all subcategories of this category
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
      // Also select the parent category if not selected
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

  // Clear all filters
  const clearAllFilters = () => {
    setDateRange("last30")
    setCustomStartDate("")
    setCustomEndDate("")
    setSelectedCategoryIds(new Set())
    setSelectedSubcategoryIds(new Set())
    // Reset to default exclusions
    const transfersCategory = categories.find((c) => c.name === "🔁 Transfers")
    if (transfersCategory) {
      setExcludedCategoryIds(new Set([transfersCategory.id]))
    } else {
      setExcludedCategoryIds(new Set())
    }
    setShowIncome(false)
    setShowExpenses(true)
  }

  // Check if any filters are active (excluding default transfers exclusion)
  const defaultExcludedCategory = categories.find((c) => c.name === "🔁 Transfers")
  const hasNonDefaultExclusions =
    excludedCategoryIds.size > 0 &&
    (excludedCategoryIds.size > 1 || !defaultExcludedCategory || !excludedCategoryIds.has(defaultExcludedCategory.id))

  const hasActiveFilters =
    dateRange !== "last30" ||
    selectedCategoryIds.size > 0 ||
    selectedSubcategoryIds.size > 0 ||
    showIncome ||
    !showExpenses ||
    hasNonDefaultExclusions

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
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
                      {customStartDate ? format(parseLocalDate(customStartDate), "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate ? parseLocalDate(customStartDate) : undefined}
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
                      {customEndDate ? format(parseLocalDate(customEndDate), "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate ? parseLocalDate(customEndDate) : undefined}
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
            <Button variant="outline" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}>
              <span>Select Categories...</span>
              <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {/* Dropdown Menu */}
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Include Categories</h4>
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
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Exclude Categories</h4>
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
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Selected Filter Chips */}
        {(selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0) && (
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
                  <button onClick={() => toggleCategory(catId)} className="hover:bg-primary/20 rounded-full p-0.5">
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
                    onClick={() => toggleSubcategory(subId, category.id)}
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
                    onClick={() => toggleExcludedCategory(catId)}
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
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Total Transactions</div>
          <div className="text-3xl font-bold text-foreground">{stats.count}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
          <div className="text-3xl font-bold text-destructive">${formatAmount(stats.totalExpenses)}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Total Income</div>
          <div className="text-3xl font-bold text-success">${formatAmount(stats.totalIncome)}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Avg Transaction</div>
          <div className="text-3xl font-bold text-foreground">${formatAmount(stats.avgTransaction)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Spending by Category (Top 10)</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 50, 300)}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>

              {/* Category Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {categoryData.slice(0, 5).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {cat.imageUrl && (
                        <Image
                          src={cat.imageUrl}
                          alt={cat.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded flex-shrink-0"
                        />
                      )}
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                    </div>
                    <span className="font-medium text-foreground ml-2 flex-shrink-0">${formatAmount(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* Subcategory Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Spending by Subcategory (Top 10)</h3>
          {subcategoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(subcategoryData.length * 50, 300)}>
                <BarChart data={subcategoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={250} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `$${formatAmount(value)}`} />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              {/* Subcategory Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {subcategoryData.slice(0, 5).map((sub) => (
                  <div key={sub.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {sub.imageUrl && (
                        <Image
                          src={sub.imageUrl}
                          alt={sub.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded flex-shrink-0"
                        />
                      )}
                      <span className="text-muted-foreground truncate">{sub.name}</span>
                    </div>
                    <span className="font-medium text-foreground ml-2 flex-shrink-0">${formatAmount(sub.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Spending Trend Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) =>
                  `$${value.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
              />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Transaction Details</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Showing {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  onClick={() => toggleSort("date")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-muted"
                >
                  Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th
                  onClick={() => toggleSort("category")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-muted"
                >
                  Category {sortBy === "category" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th
                  onClick={() => toggleSort("amount")}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-muted"
                >
                  Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => (window.location.href = `/transactions/${transaction.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {formatTransactionDate(transaction.datetime, "medium")}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      {transaction.logoUrl && (
                        <Image
                          src={transaction.logoUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-medium hover:text-primary">{transaction.name}</div>
                        {transaction.merchantName && (
                          <div className="text-xs text-gray-500">{transaction.merchantName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {transaction.category?.imageUrl && (
                        <Image
                          src={transaction.category.imageUrl}
                          alt=""
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded"
                        />
                      )}
                      <span className="text-foreground">{transaction.category?.name || "Uncategorized"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.subcategory?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.account?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={
                        transaction.amount_number < 0 ? "text-destructive font-medium" : "text-success font-medium"
                      }
                    >
                      {transaction.amount_number < 0 ? "-" : "+"}$
                      {Math.abs(transaction.amount_number).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">No transactions found matching the selected filters.</div>
        )}
      </div>
    </div>
  )
}
