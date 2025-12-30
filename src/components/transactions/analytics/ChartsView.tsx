"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import type { CategoryForClient, TransactionForClient } from "@/types"
import { useTransactionFilters } from "@/hooks/useTransactionFilters"
import { useChartData } from "@/hooks/useChartData"
import { ChartFiltersPanel } from "./ChartFiltersPanel"
import {
  SubcategoryChartTab,
  MonthlyComparisonChartTab,
  SpendingTrendsChartTab,
  IncomeVsExpensesChartTab,
  CategoryBreakdownChartTab,
} from "./charts"
import { CHART_TABS, type ChartTab } from "@/lib/constants/charts"

interface ChartsViewProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
}

export function ChartsView({ transactions, categories }: ChartsViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("subcategories")

  // Use the shared transaction filters hook
  const filters = useTransactionFilters({
    categories,
    defaultDateRange: "last30",
    defaultShowIncome: false,
    defaultShowExpenses: true,
    excludeTransfersByDefault: true,
  })

  // Determine if filters should be disabled for current tab
  const filtersDisabled = activeTab === "monthly-comparison"

  // Filter transactions using the hook's filter function
  const filteredTransactions = useMemo(() => {
    if (filtersDisabled) {
      return transactions
    }
    return filters.filterTransactions(transactions)
  }, [transactions, filters, filtersDisabled])

  // Use the chart data hook for calculations
  const chartData = useChartData({
    transactions,
    filteredTransactions,
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ChartFiltersPanel
        categories={categories}
        dateRange={filters.dateRange}
        setDateRange={filters.setDateRange}
        customStartDate={filters.customStartDate}
        setCustomStartDate={filters.setCustomStartDate}
        customEndDate={filters.customEndDate}
        setCustomEndDate={filters.setCustomEndDate}
        selectedCategoryIds={filters.selectedCategoryIds}
        setSelectedCategoryIds={filters.setSelectedCategoryIds}
        selectedSubcategoryIds={filters.selectedSubcategoryIds}
        setSelectedSubcategoryIds={filters.setSelectedSubcategoryIds}
        excludedCategoryIds={filters.excludedCategoryIds}
        setExcludedCategoryIds={filters.setExcludedCategoryIds}
        showIncome={filters.showIncome}
        setShowIncome={filters.setShowIncome}
        showExpenses={filters.showExpenses}
        setShowExpenses={filters.setShowExpenses}
        hasActiveFilters={filters.hasActiveFilters}
        clearAllFilters={filters.clearAllFilters}
        disabled={filtersDisabled}
      />

      {/* Tabs */}
      <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto">
            {CHART_TABS.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-6 py-4 rounded-none border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-muted-foreground hover:border-border"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </Button>
            ))}
          </nav>
        </div>

        {/* Chart Content */}
        <div className="p-6">
          {activeTab === "subcategories" && (
            <SubcategoryChartTab data={chartData.subcategoryData} />
          )}

          {activeTab === "monthly-comparison" && (
            <MonthlyComparisonChartTab data={chartData.monthlyComparisonData} />
          )}

          {activeTab === "spending-trends" && (
            <SpendingTrendsChartTab data={chartData.spendingTrendsData} />
          )}

          {activeTab === "income-vs-expenses" && (
            <IncomeVsExpensesChartTab data={chartData.incomeVsExpensesData} />
          )}

          {activeTab === "category-breakdown" && (
            <CategoryBreakdownChartTab data={chartData.categoryData} />
          )}
        </div>
      </div>
    </div>
  )
}
