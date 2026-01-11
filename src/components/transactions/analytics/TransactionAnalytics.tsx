"use client"

import { useState, useMemo, useRef, RefObject } from "react"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { CategoryForClient, TransactionForClient } from "@/types/client"
import { useClickOutside } from "@/hooks/useClickOutside"
import {
  compareTransactionDates,
  isTransactionInDateRange,
  getTransactionMonth,
  formatTransactionMonth,
  dateToString,
} from "@/lib/utils/transaction-date"
import { AnalyticsFilters } from "./AnalyticsFilters"
import { AnalyticsSummaryStats } from "./AnalyticsSummaryStats"
import { AnalyticsCategoryCharts } from "./AnalyticsCategoryCharts"
import { AnalyticsMonthlyChart } from "./AnalyticsMonthlyChart"
import { AnalyticsTransactionTable } from "./AnalyticsTransactionTable"

interface TransactionAnalyticsProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
}

type DateRange = "all" | "last30" | "last90" | "thisMonth" | "lastMonth" | "custom"

/**
 * Transaction analytics dashboard with filters, charts, and transaction table
 *
 * This component orchestrates:
 * - Date range and category filtering
 * - Statistics calculations
 * - Category/subcategory breakdown charts
 * - Monthly trend visualization
 * - Sortable transaction table
 */
export function TransactionAnalytics({ transactions, categories }: TransactionAnalyticsProps) {
  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>("last30")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showIncome, setShowIncome] = useState(false)
  const [showExpenses, setShowExpenses] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sort state
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Set default exclusions (TRANSFER categories) on mount
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(() => {
    const transfersCategory = categories.find((cat) => cat.groupType === "TRANSFER")
    return transfersCategory ? new Set([transfersCategory.id]) : new Set()
  })

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef as RefObject<HTMLElement>, () => setShowCategoryDropdown(false), showCategoryDropdown)

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
          range = { start: new Date(customStartDate), end: new Date(customEndDate) }
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
      return []
    } else if (showIncome && !showExpenses) {
      filtered = filtered.filter((t) => t.amount_number > 0)
    } else if (!showIncome && showExpenses) {
      filtered = filtered.filter((t) => t.amount_number < 0)
    }

    // Exclude categories filter
    if (excludedCategoryIds.size > 0) {
      filtered = filtered.filter((t) => {
        if (!t.categoryId) return true
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

    return { total, totalExpenses, totalIncome, count: filteredTransactions.length, avgTransaction }
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
        categoryMap.set(categoryName, { name: categoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
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
        subcategoryMap.set(subcategoryName, { name: subcategoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(subcategoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [filteredTransactions])

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>()

    filteredTransactions.forEach((t) => {
      const monthKey = getTransactionMonth(t.datetime)
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

  // Toggle handlers
  const toggleSort = (field: "date" | "amount" | "category") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

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

  const toggleExcludedCategory = (categoryId: string) => {
    const newExcluded = new Set(excludedCategoryIds)
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId)
    } else {
      newExcluded.add(categoryId)
    }
    setExcludedCategoryIds(newExcluded)
  }

  const clearAllFilters = () => {
    setDateRange("last30")
    setCustomStartDate("")
    setCustomEndDate("")
    setSelectedCategoryIds(new Set())
    setSelectedSubcategoryIds(new Set())
    const transfersCategory = categories.find((c) => c.groupType === "TRANSFER")
    setExcludedCategoryIds(transfersCategory ? new Set([transfersCategory.id]) : new Set())
    setShowIncome(false)
    setShowExpenses(true)
  }

  // Check if any filters are active
  const defaultExcludedCategory = categories.find((c) => c.groupType === "TRANSFER")
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
      <AnalyticsFilters
        categories={categories}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        setCustomStartDate={setCustomStartDate}
        setCustomEndDate={setCustomEndDate}
        selectedCategoryIds={selectedCategoryIds}
        selectedSubcategoryIds={selectedSubcategoryIds}
        excludedCategoryIds={excludedCategoryIds}
        showCategoryDropdown={showCategoryDropdown}
        setShowCategoryDropdown={setShowCategoryDropdown}
        showIncome={showIncome}
        setShowIncome={setShowIncome}
        showExpenses={showExpenses}
        setShowExpenses={setShowExpenses}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        onToggleCategory={toggleCategory}
        onToggleSubcategory={toggleSubcategory}
        onToggleExcludedCategory={toggleExcludedCategory}
        dropdownRef={dropdownRef}
      />

      <AnalyticsSummaryStats
        count={stats.count}
        totalExpenses={stats.totalExpenses}
        totalIncome={stats.totalIncome}
        avgTransaction={stats.avgTransaction}
      />

      <AnalyticsCategoryCharts categoryData={categoryData} subcategoryData={subcategoryData} />

      <AnalyticsMonthlyChart monthlyData={monthlyData} />

      <AnalyticsTransactionTable
        transactions={filteredTransactions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onToggleSort={toggleSort}
      />
    </div>
  )
}
