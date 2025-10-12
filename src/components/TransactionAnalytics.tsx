'use client'

import { useState, useMemo } from 'react'
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import Link from 'next/link'

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showExpensesOnly, setShowExpensesOnly] = useState(true)
  const [useCustomCategories, setUseCustomCategories] = useState(true) // Custom categories ON by default

  // Get unique categories and subcategories from transactions
  const { uniqueCategories, uniqueSubcategories } = useMemo(() => {
    const categories = new Set<string>()
    const subcategories = new Set<string>()

    transactions.forEach(t => {
      if (useCustomCategories) {
        // Use custom categories
        if (t.customCategory) categories.add(t.customCategory.name)
        if (t.customSubcategory) subcategories.add(t.customSubcategory.name)
      } else {
        // Use Plaid categories
        if (t.category) categories.add(t.category)
        if (t.subcategory) subcategories.add(t.subcategory)
      }
    })

    return {
      uniqueCategories: Array.from(categories).sort(),
      uniqueSubcategories: Array.from(subcategories).sort(),
    }
  }, [transactions, useCustomCategories])

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

    // Expenses only filter
    if (showExpensesOnly) {
      filtered = filtered.filter(t => Number(t.amount) > 0)
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (useCustomCategories) {
        filtered = filtered.filter(t => t.customCategory?.name === selectedCategory)
      } else {
        filtered = filtered.filter(t => t.category === selectedCategory)
      }
    }

    // Subcategory filter
    if (selectedSubcategory !== 'all') {
      if (useCustomCategories) {
        filtered = filtered.filter(t => t.customSubcategory?.name === selectedSubcategory)
      } else {
        filtered = filtered.filter(t => t.subcategory === selectedSubcategory)
      }
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
          const catA = useCustomCategories 
            ? (a.customCategory?.name || '') 
            : (a.category || '')
          const catB = useCustomCategories 
            ? (b.customCategory?.name || '') 
            : (b.category || '')
          comparison = catA.localeCompare(catB)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [transactions, dateRange, customStartDate, customEndDate, selectedCategory, selectedSubcategory, sortBy, sortOrder, showExpensesOnly, useCustomCategories])

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
      let categoryName: string
      let imageUrl: string | null | undefined

      if (useCustomCategories) {
        categoryName = t.customCategory?.name || 'Uncategorized'
        imageUrl = t.customCategory?.imageUrl
      } else {
        categoryName = t.category || 'Uncategorized'
        imageUrl = t.categoryIconUrl
      }

      if (categoryMap.has(categoryName)) {
        categoryMap.get(categoryName)!.value += amount
      } else {
        categoryMap.set(categoryName, { name: categoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 categories
  }, [filteredTransactions, useCustomCategories])

  // Subcategory breakdown data
  const subcategoryData = useMemo(() => {
    const subcategoryMap = new Map<string, { name: string, value: number, imageUrl?: string }>()

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount))
      let subcategoryName: string
      let imageUrl: string | null | undefined

      if (useCustomCategories) {
        subcategoryName = t.customSubcategory?.name || 'No Subcategory'
        imageUrl = t.customSubcategory?.imageUrl
      } else {
        subcategoryName = t.subcategory || 'No Subcategory'
        imageUrl = undefined
      }

      if (subcategoryMap.has(subcategoryName)) {
        subcategoryMap.get(subcategoryName)!.value += amount
      } else {
        subcategoryMap.set(subcategoryName, { name: subcategoryName, value: amount, imageUrl: imageUrl || undefined })
      }
    })

    return Array.from(subcategoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 subcategories
  }, [filteredTransactions, useCustomCategories])

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

  return (
    <div className="space-y-6">
      {/* Category Type Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Category Type</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {useCustomCategories ? 'Using your custom categories' : 'Using Plaid categories'}
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <span className={`text-sm font-medium mr-3 ${!useCustomCategories ? 'text-gray-900' : 'text-gray-500'}`}>
              Plaid
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={useCustomCategories}
                onChange={(e) => {
                  setUseCustomCategories(e.target.checked)
                  setSelectedCategory('all')
                  setSelectedSubcategory('all')
                }}
                className="sr-only"
              />
              <div className={`block w-14 h-8 rounded-full ${useCustomCategories ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${useCustomCategories ? 'translate-x-6' : ''}`}></div>
            </div>
            <span className={`text-sm font-medium ml-3 ${useCustomCategories ? 'text-gray-900' : 'text-gray-500'}`}>
              Custom
            </span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {useCustomCategories ? 'Custom Category' : 'Plaid Category'}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('all')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {useCustomCategories ? 'Custom Subcategory' : 'Plaid Subcategory'}
            </label>
            <select
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Subcategories</option>
              {uniqueSubcategories.map(sub => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Show Expenses Only Toggle */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showExpensesOnly}
                onChange={(e) => setShowExpensesOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Expenses Only
              </span>
            </label>
          </div>
        </div>
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
            Spending by {useCustomCategories ? 'Custom' : 'Plaid'} Category (Top 10)
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
            Spending by {useCustomCategories ? 'Custom' : 'Plaid'} Subcategory (Top 10)
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
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      {(transaction.logoUrl || transaction.categoryIconUrl) && (
                        <img
                          src={transaction.logoUrl || transaction.categoryIconUrl || ''}
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
                      {useCustomCategories ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          {transaction.categoryIconUrl && (
                            <img
                              src={transaction.categoryIconUrl}
                              alt=""
                              className="w-5 h-5 rounded"
                            />
                          )}
                          <span className="text-gray-900">
                            {transaction.category || 'Uncategorized'}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {useCustomCategories 
                      ? (transaction.customSubcategory?.name || '-')
                      : (transaction.subcategory || '-')
                    }
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
