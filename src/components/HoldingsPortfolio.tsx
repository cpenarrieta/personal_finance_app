'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface SerializedHolding {
  id: string
  accountId: string
  securityId: string
  quantity: number
  costBasis: number | null
  institutionPrice: number | null
  institutionPriceAsOf: string | null
  isoCurrencyCode: string | null
  createdAt: string
  updatedAt: string
  account: {
    id: string
    name: string
    type: string
    subtype: string | null
  }
  security: {
    id: string
    name: string | null
    tickerSymbol: string | null
    type: string | null
    isoCurrencyCode: string | null
    logoUrl: string | null
  }
}

interface HoldingsPortfolioProps {
  holdings: SerializedHolding[]
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#f43f5e', '#22c55e', '#eab308', '#a855f7'
]

type GroupBy = 'none' | 'ticker'
type SortBy = 'ticker' | 'value' | 'gainLoss' | 'gainLossPercent' | 'quantity'

export function HoldingsPortfolio({ holdings }: HoldingsPortfolioProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortBy, setSortBy] = useState<SortBy>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Get unique accounts
  const uniqueAccounts = useMemo(() => {
    const accounts = new Map<string, string>()
    holdings.forEach(h => {
      accounts.set(h.account.id, h.account.name)
    })
    return Array.from(accounts.entries())
  }, [holdings])

  // Filter holdings
  const filteredHoldings = useMemo(() => {
    let filtered = holdings

    // Account filter
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(h => h.account.id === selectedAccount)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(h =>
        (h.security.tickerSymbol?.toLowerCase().includes(query)) ||
        (h.security.name?.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [holdings, selectedAccount, searchQuery])

  // Calculate enhanced holding data
  const enhancedHoldings = useMemo(() => {
    return filteredHoldings.map(h => {
      const quantity = Number(h.quantity)
      const price = Number(h.institutionPrice || 0)
      const costBasis = Number(h.costBasis || 0) // Total cost basis (already the total amount spent)
      const marketValue = quantity * price
      const totalCost = costBasis // costBasis is already the total cost
      const avgCostBasis = quantity > 0 ? costBasis / quantity : 0 // Calculate per-share cost
      const gainLoss = marketValue - totalCost
      const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

      return {
        ...h,
        calculatedQuantity: quantity,
        calculatedPrice: price,
        calculatedCostBasis: avgCostBasis, // Store the per-share cost for display
        marketValue,
        totalCost,
        gainLoss,
        gainLossPercent,
      }
    })
  }, [filteredHoldings])

  // Group holdings
  const groupedHoldings = useMemo(() => {
    if (groupBy === 'none') {
      return enhancedHoldings
    }

    const groups = new Map<string, typeof enhancedHoldings>()

    enhancedHoldings.forEach(h => {
      const key = h.security.tickerSymbol || 'Unknown'

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(h)
    })

    // Aggregate grouped data
    const aggregated = Array.from(groups.entries()).map(([key, items]) => {
      const totalQuantity = items.reduce((sum, item) => sum + item.calculatedQuantity, 0)
      const totalMarketValue = items.reduce((sum, item) => sum + item.marketValue, 0)
      const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0)
      const totalGainLoss = totalMarketValue - totalCost
      const avgPrice = totalQuantity > 0 ? totalMarketValue / totalQuantity : 0
      const avgCostBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0
      const gainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

      // Use first item as template
      const template = items[0]

      return {
        ...template,
        id: key,
        calculatedQuantity: totalQuantity,
        calculatedPrice: avgPrice,
        calculatedCostBasis: avgCostBasis,
        marketValue: totalMarketValue,
        totalCost,
        gainLoss: totalGainLoss,
        gainLossPercent,
        _isGrouped: true,
        _groupItems: items,
      }
    })

    return aggregated
  }, [enhancedHoldings, groupBy])

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    const sorted = [...groupedHoldings]

    sorted.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'ticker':
          comparison = (a.security?.tickerSymbol || '').localeCompare(b.security?.tickerSymbol || '')
          break
        case 'value':
          comparison = a.marketValue - b.marketValue
          break
        case 'gainLoss':
          comparison = a.gainLoss - b.gainLoss
          break
        case 'gainLossPercent':
          comparison = a.gainLossPercent - b.gainLossPercent
          break
        case 'quantity':
          comparison = a.calculatedQuantity - b.calculatedQuantity
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [groupedHoldings, sortBy, sortOrder])

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    const totalValue = enhancedHoldings.reduce((sum, h) => sum + h.marketValue, 0)
    const totalCost = enhancedHoldings.reduce((sum, h) => sum + h.totalCost, 0)
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    // Best and worst performers
    const withGains = enhancedHoldings.filter(h => h.totalCost > 0)
    const bestPerformer = withGains.length > 0
      ? withGains.reduce((best, h) => h.gainLossPercent > best.gainLossPercent ? h : best)
      : null
    const worstPerformer = withGains.length > 0
      ? withGains.reduce((worst, h) => h.gainLossPercent < worst.gainLossPercent ? h : worst)
      : null

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      holdingsCount: enhancedHoldings.length,
      bestPerformer,
      worstPerformer,
    }
  }, [enhancedHoldings])

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    const tickerMap = new Map<string, number>()

    enhancedHoldings.forEach(h => {
      const ticker = h.security.tickerSymbol || 'Unknown'
      tickerMap.set(ticker, (tickerMap.get(ticker) || 0) + h.marketValue)
    })

    return Array.from(tickerMap.entries())
      .map(([ticker, value]) => ({
        name: ticker,
        value,
        percent: portfolioStats.totalValue > 0 ? (value / portfolioStats.totalValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10
  }, [enhancedHoldings, portfolioStats.totalValue])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  if (holdings.length === 0) {
    return <p className="text-gray-500">No holdings found.</p>
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Filters & Controls</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Ticker or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">Individual Holdings</option>
              <option value="ticker">Stock Ticker (Consolidated)</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Accounts</option>
              {uniqueAccounts.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="value">Market Value</option>
              <option value="gainLoss">Gain/Loss ($)</option>
              <option value="gainLossPercent">Gain/Loss (%)</option>
              <option value="ticker">Ticker</option>
              <option value="quantity">Quantity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Portfolio Value</div>
          <div className="text-3xl font-bold text-gray-900">
            ${portfolioStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Total Gain/Loss</div>
          <div className={`text-3xl font-bold ${portfolioStats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioStats.totalGainLoss >= 0 ? '+' : ''}${portfolioStats.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-sm ${portfolioStats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioStats.totalGainLoss >= 0 ? '+' : ''}{portfolioStats.totalGainLossPercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Best Performer</div>
          {portfolioStats.bestPerformer ? (
            <>
              <div className="text-xl font-bold text-green-600">
                {portfolioStats.bestPerformer.security.tickerSymbol}
              </div>
              <div className="text-sm text-green-600">
                +{portfolioStats.bestPerformer.gainLossPercent.toFixed(2)}%
              </div>
            </>
          ) : (
            <div className="text-gray-400">N/A</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-600 mb-1">Worst Performer</div>
          {portfolioStats.worstPerformer ? (
            <>
              <div className="text-xl font-bold text-red-600">
                {portfolioStats.worstPerformer.security.tickerSymbol}
              </div>
              <div className="text-sm text-red-600">
                {portfolioStats.worstPerformer.gainLossPercent.toFixed(2)}%
              </div>
            </>
          ) : (
            <div className="text-gray-400">N/A</div>
          )}
        </div>
      </div>

      {/* Allocation Chart */}
      {allocationData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent as number).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {allocationData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.percent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Holdings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {sortedHoldings.length} {groupBy !== 'none' ? 'grouped ' : ''}holding{sortedHoldings.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security
                </th>
                <th
                  onClick={() => toggleSort('quantity')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Quantity {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost
                </th>
                <th
                  onClick={() => toggleSort('value')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Market Value {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('gainLoss')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Gain/Loss {sortBy === 'gainLoss' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('gainLossPercent')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Return {sortBy === 'gainLossPercent' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                {groupBy === 'none' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedHoldings.map((holding) => (
                <tr key={holding.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {holding.security?.logoUrl && (
                        <Image
                          src={holding.security.logoUrl}
                          alt={holding.security?.tickerSymbol || ''}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          {holding.security?.tickerSymbol || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {holding.security?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {holding.calculatedQuantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    ${holding.calculatedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    ${holding.calculatedCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${holding.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span className={holding.gainLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {holding.gainLoss >= 0 ? '+' : ''}${holding.gainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span className={holding.gainLossPercent >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                    </span>
                  </td>
                  {groupBy === 'none' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holding.account?.name}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedHoldings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No holdings found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  )
}
