'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, startOfYear, eachMonthOfInterval } from 'date-fns'

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

interface ChartsViewProps {
  transactions: SerializedTransaction[]
}

type DateRange = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'
type ChartTab = 'subcategories' | 'monthly-comparison' | 'spending-trends' | 'income-vs-expenses' | 'category-breakdown'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16']

export function ChartsView({ transactions }: ChartsViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('subcategories')
  const [dateRange, setDateRange] = useState<DateRange>('last30')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<Set<string>>(new Set())
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<Set<string>>(new Set())
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
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
          const transfersCategory = data.find((cat: any) => cat.name === '🔁 Transfers')
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

  // Determine if filters should be disabled for current tab
  const filtersDisabled = activeTab === 'monthly-comparison'

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // For monthly comparison, we don't apply filters
    if (filtersDisabled) {
      return transactions
    }

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
        isWithinInterval(parseISO(t.date), { start: range.start, end: range.end })
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

    return filtered
  }, [transactions, dateRange, customStartDate, customEndDate, selectedCategoryIds, selectedSubcategoryIds, excludedCategoryIds, showIncome, showExpenses, filtersDisabled])

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
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

  // Chart data calculations
  const subcategoryData = useMemo(() => {
    const subcategoryMap = new Map<string, { name: string, value: number, imageUrl?: string, categoryName?: string }>()

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount))
      const subcategoryName = t.customSubcategory?.name || 'No Subcategory'
      const imageUrl = t.customSubcategory?.imageUrl
      const categoryName = t.customSubcategory?.category?.name || t.customCategory?.name || 'Uncategorized'

      if (subcategoryMap.has(subcategoryName)) {
        subcategoryMap.get(subcategoryName)!.value += amount
      } else {
        subcategoryMap.set(subcategoryName, { name: subcategoryName, value: amount, imageUrl: imageUrl || undefined, categoryName })
      }
    })

    return Array.from(subcategoryMap.values())
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

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
  }, [filteredTransactions])

  const monthlyComparisonData = useMemo(() => {
    // Get last 12 months of data
    const now = new Date()
    const startDate = subMonths(startOfMonth(now), 11)
    const months = eachMonthOfInterval({ start: startDate, end: now })

    return months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const monthTransactions = transactions.filter(t =>
        isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
      )

      const expenses = monthTransactions
        .filter(t => Number(t.amount) > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const income = Math.abs(monthTransactions
        .filter(t => Number(t.amount) < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0))

      return {
        month: format(month, 'MMM yyyy'),
        expenses,
        income,
        net: income - expenses
      }
    })
  }, [transactions])

  const spendingTrendsData = useMemo(() => {
    const monthMap = new Map<string, number>()

    filteredTransactions.forEach(t => {
      const month = format(parseISO(t.date), 'MMM yyyy')
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

  const incomeVsExpensesData = useMemo(() => {
    const expenses = filteredTransactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const income = Math.abs(filteredTransactions
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Number(t.amount), 0))

    return [
      { name: 'Income', value: income },
      { name: 'Expenses', value: expenses },
      { name: 'Net', value: income - expenses }
    ]
  }, [filteredTransactions])

  const tabs = [
    { id: 'subcategories' as ChartTab, name: 'Subcategories', icon: '📊' },
    { id: 'monthly-comparison' as ChartTab, name: 'Monthly Comparison', icon: '📅' },
    { id: 'spending-trends' as ChartTab, name: 'Spending Trends', icon: '📈' },
    { id: 'income-vs-expenses' as ChartTab, name: 'Income vs Expenses', icon: '💰' },
    { id: 'category-breakdown' as ChartTab, name: 'Category Breakdown', icon: '🥧' },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border relative">
        {filtersDisabled && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⚠️ Filters disabled for this chart
            </span>
          </div>
        )}
        <div className={`flex flex-wrap items-center gap-4 ${filtersDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Date Range */}
          <div className="flex-shrink-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={filtersDisabled}
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
                  disabled={filtersDisabled}
                />
              </div>
              <div className="flex-shrink-0">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="End date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={filtersDisabled}
                />
              </div>
            </>
          )}

          {/* Category/Subcategory Multi-select */}
          <div className="flex-shrink-0 relative" ref={dropdownRef}>
            <button
              onClick={() => !filtersDisabled && setShowCategoryDropdown(!showCategoryDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-2"
              disabled={filtersDisabled}
            >
              <span className="text-gray-700">Categories...</span>
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showCategoryDropdown && !filtersDisabled && (
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
              disabled={filtersDisabled}
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
              disabled={filtersDisabled}
            />
            <span className="ml-2 text-sm text-gray-700">Expenses</span>
          </label>

          {/* Clear Filters */}
          {hasActiveFilters && !filtersDisabled && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Selected Filter Chips */}
        {!filtersDisabled && (selectedCategoryIds.size > 0 || selectedSubcategoryIds.size > 0 || excludedCategoryIds.size > 0) && (
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Chart Content */}
        <div className="p-6">
          {activeTab === 'subcategories' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Spending by Subcategory</h3>
              {subcategoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(subcategoryData.length * 40, 400)}>
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
                        width={200}
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

                  {/* Subcategory Summary Table */}
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-3">Detailed Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subcategory
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {subcategoryData.map((sub, index) => {
                            const total = subcategoryData.reduce((sum, s) => sum + s.value, 0)
                            const percentage = (sub.value / total) * 100
                            return (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-2">
                                    {sub.imageUrl && (
                                      <img src={sub.imageUrl} alt="" className="w-5 h-5 rounded" />
                                    )}
                                    {sub.name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {sub.categoryName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                  ${sub.value.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                  {percentage.toFixed(1)}%
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          )}

          {activeTab === 'monthly-comparison' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Monthly Income vs Expenses (Last 12 Months)</h3>
              {monthlyComparisonData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={monthlyComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-3">Monthly Summary</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Month
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Income
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expenses
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Net
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {monthlyComparisonData.map((month, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {month.month}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                                ${month.income.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                                ${month.expenses.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                                month.net >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {month.net >= 0 ? '+' : ''}${month.net.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          )}

          {activeTab === 'spending-trends' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Spending Trends Over Time</h3>
              {spendingTrendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={spendingTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} name="Spending" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          )}

          {activeTab === 'income-vs-expenses' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Income vs Expenses Overview</h3>
              {incomeVsExpensesData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeVsExpensesData.filter(d => d.name !== 'Net')}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {incomeVsExpensesData.filter(d => d.name !== 'Net').map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#10b981' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex flex-col justify-center space-y-4">
                    {incomeVsExpensesData.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">{item.name}</div>
                        <div className={`text-2xl font-bold ${
                          item.name === 'Income' ? 'text-green-600' :
                          item.name === 'Expenses' ? 'text-red-600' :
                          item.value >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.name !== 'Net' && item.name === 'Expenses' ? '-' : item.value >= 0 ? '+' : ''}
                          ${Math.abs(item.value).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          )}

          {activeTab === 'category-breakdown' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
              {categoryData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2">
                    <h4 className="text-md font-medium mb-3">Category Summary</h4>
                    {categoryData.map((cat, index) => {
                      const total = categoryData.reduce((sum, c) => sum + c.value, 0)
                      const percentage = (cat.value / total) * 100
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-4 h-4 rounded flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {cat.imageUrl && (
                              <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 truncate">{cat.name}</span>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <div className="text-sm font-medium text-gray-900">
                              ${cat.value.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No data available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
