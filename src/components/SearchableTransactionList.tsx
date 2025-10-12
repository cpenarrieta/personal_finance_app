'use client'

import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import { EditTransactionModal } from './EditTransactionModal'
import Link from 'next/link'

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
    name: string
    type: string
    mask: string | null
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

interface SearchableTransactionListProps {
  transactions: SerializedTransaction[]
}

type DateRange = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom'

export function SearchableTransactionList({ transactions }: SearchableTransactionListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<SerializedTransaction | null>(null)
  const [useCustomCategories, setUseCustomCategories] = useState(true) // Custom categories ON by default
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false) // Filter for uncategorized transactions

  // Filter transactions based on search query and date range
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

    // Uncategorized filter
    if (showOnlyUncategorized) {
      if (useCustomCategories) {
        filtered = filtered.filter(t => !t.customCategory)
      } else {
        filtered = filtered.filter(t => !t.category)
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      filtered = filtered.filter(t => {
        // Search in multiple fields
        const searchableText = [
          t.name,
          t.merchantName,
          useCustomCategories ? t.customCategory?.name : t.category,
          useCustomCategories ? t.customSubcategory?.name : t.subcategory,
          t.account?.name,
          t.isoCurrencyCode,
          t.amount,
          t.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(query)
      })
    }

    return filtered
  }, [transactions, searchQuery, dateRange, customStartDate, customEndDate, useCustomCategories, showOnlyUncategorized])

  // Calculate totals for filtered transactions
  const totals = useMemo(() => {
    const expenses = filteredTransactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const income = Math.abs(
      filteredTransactions
        .filter(t => Number(t.amount) < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    )

    const netBalance = income - expenses

    return {
      expenses,
      income,
      netBalance,
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  return (
    <div className="space-y-4">
      {/* Category Type Toggle and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Category Type</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {useCustomCategories ? 'Using your custom categories' : 'Using Plaid categories'}
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyUncategorized}
                onChange={(e) => setShowOnlyUncategorized(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Show only uncategorized
              </span>
            </label>
          </div>
          <label className="flex items-center cursor-pointer">
            <span className={`text-sm font-medium mr-3 ${!useCustomCategories ? 'text-gray-900' : 'text-gray-500'}`}>
              Plaid
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={useCustomCategories}
                onChange={(e) => setUseCustomCategories(e.target.checked)}
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

      {/* Search and Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Date Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Selector */}
            <div className={dateRange === 'custom' ? 'md:col-span-1' : 'md:col-span-3'}>
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
          </div>

          {/* Search Box */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions (name, merchant, category, account, amount...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Income</div>
          <div className="text-2xl font-bold text-green-600">
            +${totals.income.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">
            -${totals.expenses.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Net Balance</div>
          <div className={`text-2xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totals.netBalance >= 0 ? '+' : ''}${totals.netBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No transactions found matching your search.' : 'No transactions found.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredTransactions.map(t => (
              <li key={t.id} className="hover:bg-gray-50 transition-colors">
                <div className="p-4 flex items-start gap-3">
                  {(t.logoUrl || t.categoryIconUrl) && (
                    <img
                      src={t.logoUrl || t.categoryIconUrl || ''}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0 mt-0.5 cursor-pointer"
                      onClick={() => setEditingTransaction(t)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setEditingTransaction(t)}
                      >
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <span className="truncate">{t.name}</span>
                          {t.pending && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex-shrink-0">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {format(new Date(t.date), 'MMM dd, yyyy')}
                          {t.account && ` • ${t.account.name}`}
                        </div>
                        {t.merchantName && (
                          <div className="text-sm text-gray-500 mt-1">
                            Merchant: {t.merchantName}
                          </div>
                        )}
                        {useCustomCategories ? (
                          t.customCategory && (
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              {t.customCategory.imageUrl && (
                                <img src={t.customCategory.imageUrl} alt="" className="w-4 h-4 rounded" />
                              )}
                              <span>Category: {t.customCategory.name}</span>
                              {t.customSubcategory && <span className="text-gray-400">• {t.customSubcategory.name}</span>}
                            </div>
                          )
                        ) : (
                          t.category && (
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              {t.categoryIconUrl && (
                                <img src={t.categoryIconUrl} alt="" className="w-4 h-4 rounded" />
                              )}
                              <span>Category: {t.category}</span>
                              {t.subcategory && <span className="text-gray-400">• {t.subcategory}</span>}
                            </div>
                          )
                        )}
                        {t.notes && (
                          <div className="text-sm text-gray-500 mt-1 italic">
                            Note: {t.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                        <div
                          className={`text-lg font-semibold ${
                            Number(t.amount) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {Number(t.amount) > 0 ? '-' : '+'}$
                          {Math.abs(Number(t.amount)).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {t.isoCurrencyCode && (
                          <div className="text-xs text-gray-500">{t.isoCurrencyCode}</div>
                        )}
                        <Link
                          href={`/transactions/${t.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-center"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  )
}
