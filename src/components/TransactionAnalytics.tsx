'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'

// Serialized types (dates and decimals are strings)
interface SerializedTransaction {
  id: string
  plaidTransactionId: string
  accountId: string
  amount: string
  isoCurrencyCode: string | null
  date: string
  authorizedDate: string | null
  pending: boolean
  merchantName: string | null
  name: string
  category: string | null
  subcategory: string | null
  paymentChannel: string | null
  pendingTransactionId: string | null
  logoUrl: string | null
  categoryIconUrl: string | null
  customCategoryId: string | null
  customSubcategoryId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  account: {
    id: string
    plaidAccountId: string
    itemId: string
    name: string
    officialName: string | null
    mask: string | null
    type: string
    subtype: string | null
    currency: string | null
    currentBalance: string | null
    availableBalance: string | null
    creditLimit: string | null
    balanceUpdatedAt: string | null
    createdAt: string
    updatedAt: string
  } | null
  customCategory: {
    id: string
    name: string
    imageUrl: string | null
    createdAt: string
    updatedAt: string
  } | null
  customSubcategory: {
    id: string
    categoryId: string
    name: string
    imageUrl: string | null
    createdAt: string
    updatedAt: string
    category?: {
      id: string
      name: string
      imageUrl: string | null
      createdAt: string
      updatedAt: string
    }
  } | null
}

interface TransactionAnalyticsProps {
  transactions: SerializedTransaction[]
}

type DateRange = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'

export function TransactionAnalytics({ transactions }: TransactionAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange>('last30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set())
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showIncome, setShowIncome] = useState(false)
  const [showExpenses, setShowExpenses] = useState(true)
  const [categories, setCategories] = useState<{ id: string; name: string; subcategories: { id: string; name: string }[] }[]>([])

  // Fetch custom categories and set default exclusions
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/custom-categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)

          // Find and exclude "🔁 Transfers" by default
          const transfersCategory = data.find((cat: { id: string; name: string }) => cat.name === '🔁 Transfers')
          if (transfersCategory) {
            setExcludedCategoryIds(new Set([transfersCategory.id]))
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showCategoryDropdown])

  // No longer needed - we're using the categories from the API

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Calculate date range
    const now = new Date()
    let range: { start: Date; end: Date } | null = null

    switch (dateRange) {
      case 'last30':
        range = { start: subMonths(now, 1), end: now }
        break
      case 'last90':
        range = { start: subMonths(now, 3), end: now }
        break
      case 'thisMonth':
        range = { start: startOfMonth(now), end: endOfMonth(now) }
        break
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        range = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          range = { start: new Date(customStartDate), end: new Date(customEndDate) }
        }
        break
      case 'all':
      default:
        range = null
    }

    // Date range filter
    if (range) {
      filtered = filtered.filter(t =>
        isWithinInterval(new Date(t.date), { start: range.start, end: range.end })
      )
    }

    // Income/Expense filter
    if (!showIncome && !showExpenses) {
      // If neither is selected, show nothing
      return []
    } else if (showIncome && !showExpenses) {
      // Show only income (negative amounts)
      filtered = filtered.filter(t => Number(t.amount) < 0)
    } else if (!showIncome && showExpenses) {
      // Show only expenses (positive amounts)
      filtered = filtered.filter(t => Number(t.amount) > 0)
    }
    // If both are selected, show both (no filter needed)

    // Exclude categories filter
    if (excludedCategoryIds.size > 0) {
      filtered = filtered.filter(t => {
        if (!t.customCategoryId) return true // Keep uncategorized
        return !excludedCategoryIds.has(t.customCategoryId)
      })
    }

    // Category filter (include)
    if (selectedCategoryIds.size > 0) {
      filtered = filtered.filter(t => {
        if (!t.customCategoryId) return false
        return selectedCategoryIds.has(t.customCategoryId)
      })
    }

    // Subcategory filter
    if (selectedSubcategoryIds.size > 0) {
      filtered = filtered.filter(t => {
        if (!t.customSubcategoryId) return false
        return selectedSubcategoryIds.has(t.customSubcategoryId)
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = Number(a.amount) - Number(b.amount)
          break
        case 'category':
          const catA = a.customCategory?.name || ''
          const catB = b.customCategory?.name || ''
          comparison = catA.localeCompare(catB)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [transactions, dateRange, customStartDate, customEndDate, selectedCategoryIds, selectedSubcategoryIds, excludedCategoryIds, showIncome, showExpenses, sortBy, sortOrder])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = filteredTransactions.filter(t => Number(t.amount) > 0)
    const income = filteredTransactions.filter(t => Number(t.amount) < 0)

    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalIncome = Math.abs(income.reduce((sum, t) => sum + Number(t.amount), 0))

    const avgTransaction = filteredTransactions.length > 0
      ? total / filteredTransactions.length
      : 0

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
    const categoryMap = new Map<string, { name: string, value: number, imageUrl?: string }>()

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount))
      const categoryName = t.customCategory?.name || 'Uncategorized'
      const imageUrl = t.customCategory?.imageUrl

      if (categoryMap.has(categoryName)) {
        categoryMap.get(categoryName)!.value += amount
      } else {
        categoryMap.set(categoryName, { name: categoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [filteredTransactions])

  // Subcategory breakdown data
  const subcategoryData = useMemo(() => {
    const subcategoryMap = new Map<string, { name: string, value: number, imageUrl?: string }>()

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount))
      const subcategoryName = t.customSubcategory?.name || 'No Subcategory'
      const imageUrl = t.customSubcategory?.imageUrl

      if (subcategoryMap.has(subcategoryName)) {
        subcategoryMap.get(subcategoryName)!.value += amount
      } else {
        subcategoryMap.set(subcategoryName, { name: subcategoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(subcategoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 subcategories
  }, [filteredTransactions])

  // Monthly trend data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>()

    filteredTransactions.forEach(t => {
      const month = format(new Date(t.date), 'MMM yyyy')
      const amount = Math.abs(Number(t.amount))

      if (monthMap.has(month)) {
        monthMap.set(month, monthMap.get(month)! + amount)
      } else {
        monthMap.set(month, amount)
      }
    })

    return Array.from(monthMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateA.getTime() - dateB.getTime()
      })
  }, [filteredTransactions])

  const toggleSort = (field: 'date' | 'amount' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
      // Also remove all subcategories of this category
      const category = categories.find(c => c.id === categoryId)
      if (category) {
        const newSelectedSubs = new Set(selectedSubcategoryIds)
        category.subcategories.forEach(sub => newSelectedSubs.delete(sub.id))
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
    setDateRange('last30')
    setCustomStartDate('')
    setCustomEndDate('')
    setSelectedCategoryIds(new Set())
    setSelectedSubcategoryIds(new Set())
    // Reset to default exclusions
    const transfersCategory = categories.find(c => c.name === '🔁 Transfers')
    if (transfersCategory) {
      setExcludedCategoryIds(new Set([transfersCategory.id]))
    } else {
      setExcludedCategoryIds(new Set())
    }
    setShowIncome(false)
    setShowExpenses(true)
  }

  // Check if any filters are active (excluding default transfers exclusion)
  const defaultExcludedCategory = categories.find(c => c.name === '🔁 Transfers')
  const hasNonDefaultExclusions = excludedCategoryIds.size > 0 &&
    (excludedCategoryIds.size > 1 || !defaultExcludedCategory || !excludedCategoryIds.has(defaultExcludedCategory.id))

  const hasActiveFilters = dateRange !== 'last30' || selectedCategoryIds.size > 0 ||
    selectedSubcategoryIds.size > 0 || showIncome || !showExpenses || hasNonDefaultExclusions

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex-shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <>
              <div className="flex-shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Start date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-shrink-0">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="End date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Category/Subcategory Multi-select */}
          <div className="flex-shrink-0 relative" ref={dropdownRef}>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2"
            >
              <span className="text-gray-700">Select Categories...</span>
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Include Categories</h4>
                    {categories.map((category) => (
                      <div key={category.id} className="mb-2">
                        <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.has(category.id)}
                            onChange={() => toggleCategory(category.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-900">{category.name}</span>
                        </label>
                        {category.subcategories.length > 0 && selectedCategoryIds.has(category.id) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {category.subcategories.map((sub) => (
                              <label key={sub.id} className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedSubcategoryIds.has(sub.id)}
                                  onChange={() => toggleSubcategory(sub.id, category.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">{sub.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">Exclude Categories</h4>
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excludedCategoryIds.has(category.id)}
                          onChange={() => toggleExcludedCategory(category.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Income Toggle */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showIncome}
              onChange={(e) => setShowIncome(e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="ml-2 text-sm text-gray-700">Income</span>
          </label>

          {/* Expenses Toggle */}
          <label className="flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={showExpenses}
              onChange={(e) => setShowExpenses(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="ml-2 text-sm text-gray-700">Expenses</span>
          </label>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Selected Filter Chips */}
        {(selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(selectedCategoryIds).map(catId => {
              const category = categories.find(c => c.id === catId)
              if (!category) return null
              return (
                <span key={catId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  ✓ {category.name}
                  <button
                    onClick={() => toggleCategory(catId)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )
            })}
            {Array.from(selectedSubcategoryIds).map(subId => {
              const category = categories.find(c => c.subcategories.some(s => s.id === subId))
              const subcategory = category?.subcategories.find(s => s.id === subId)
              if (!subcategory || !category) return null
              return (
                <span key={subId} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  ✓ {subcategory.name}
                  <button
                    onClick={() => toggleSubcategory(subId, category.id)}
                    className="hover:bg-indigo-200 rounded-full p-0.5"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )
            })}
            {Array.from(excludedCategoryIds).map(catId => {
              const category = categories.find(c => c.id === catId)
              if (!category) return null
              return (
                <span key={`excluded-${catId}`} className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  ✕ {category.name}
                  <button
                    onClick={() => toggleExcludedCategory(catId)}
                    className="hover:bg-red-200 rounded-full p-0.5"
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
          <div className="text-sm text-gray-600 mb-1">Total Transactions</div>
          <div className="text-3xl font-bold text-gray-900">{stats.count}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
          <div className="text-3xl font-bold text-red-600">
            ${stats.totalExpenses.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Income</div>
          <div className="text-3xl font-bold text-green-600">
            ${stats.totalIncome.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Avg Transaction</div>
          <div className="text-3xl font-bold text-gray-900">
            ${Math.abs(stats.avgTransaction).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            Spending by Category (Top 10)
          </h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 50, 300)}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>

              {/* Category Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {categoryData.slice(0, 5).map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {cat.imageUrl && (
                        <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded flex-shrink-0" />
                      )}
                      <span className="text-gray-700 truncate">{cat.name}</span>
                    </div>
                    <span className="font-medium text-gray-900 ml-2 flex-shrink-0">
                      ${cat.value.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
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
          <h3 className="text-lg font-semibold mb-4">
            Spending by Subcategory (Top 10)
          </h3>
          {subcategoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={Math.max(subcategoryData.length * 50, 300)}>
                <BarChart
                  data={subcategoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={250}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => `$${value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              {/* Subcategory Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {subcategoryData.slice(0, 5).map((sub) => (
                  <div key={sub.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {sub.imageUrl && (
                        <img src={sub.imageUrl} alt="" className="w-5 h-5 rounded flex-shrink-0" />
                      )}
                      <span className="text-gray-700 truncate">{sub.name}</span>
                    </div>
                    <span className="font-medium text-gray-900 ml-2 flex-shrink-0">
                      ${sub.value.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
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
              <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`} />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Transaction Details</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  onClick={() => toggleSort('date')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th
                  onClick={() => toggleSort('category')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th
                  onClick={() => toggleSort('amount')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/transactions/${transaction.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(transaction.date), 'MMM d yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      {transaction.logoUrl && (
                        <img
                          src={transaction.logoUrl}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-medium hover:text-blue-600">{transaction.name}</div>
                        {transaction.merchantName && (
                          <div className="text-xs text-gray-500">{transaction.merchantName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {transaction.customCategory?.imageUrl && (
                        <img
                          src={transaction.customCategory.imageUrl}
                          alt=""
                          className="w-5 h-5 rounded"
                        />
                      )}
                      <span className="text-gray-900">
                        {transaction.customCategory?.name || 'Uncategorized'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.customSubcategory?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.account?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={Number(transaction.amount) > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {Number(transaction.amount) > 0 ? '-' : '+'}${Math.abs(Number(transaction.amount)).toLocaleString("en-US", {
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
          <div className="text-center py-12 text-gray-500">
            No transactions found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  )
}
