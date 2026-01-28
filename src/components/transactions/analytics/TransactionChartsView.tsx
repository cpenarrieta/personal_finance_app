"use client"

import { useMemo } from "react"
import { format, startOfMonth as dateStartOfMonth, eachMonthOfInterval } from "date-fns"
import { CashflowSankeyChart } from "@/components/charts/CashflowSankeyChart"
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart"
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart"
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart"
import { prepareCashflowSankeyData } from "@/lib/dashboard/calculations"
import type { TransactionForClient, CategoryForClient } from "@/types"
import { getTransactionDate, dateToString } from "@/lib/utils/transaction-date"

interface TransactionChartsViewProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
}

export function TransactionChartsView({ transactions, categories }: TransactionChartsViewProps) {
  const chartData = useMemo(() => {
    // Use filtered transactions - no additional date filtering
    if (transactions.length === 0) {
      return {
        spendingByCategory: [],
        spendingBySubcategory: [],
        monthlyTrendData: [],
        incomeVsExpenseData: [],
        cashflowData: { nodes: [], links: [], totalIncome: 0, totalExpenses: 0, surplus: 0 },
      }
    }

    // Get date range from filtered transactions
    const transactionDateStrings = transactions.map((t) => getTransactionDate(t.datetime))
    const minDateStr = transactionDateStrings.reduce((a, b) => (a < b ? a : b))
    const maxDateStr = transactionDateStrings.reduce((a, b) => (a > b ? a : b))

    // Generate months for the filtered date range
    const months = eachMonthOfInterval({
      start: dateStartOfMonth(new Date(minDateStr)),
      end: dateStartOfMonth(new Date(maxDateStr)),
    })

    // Spending by Category (all filtered transactions, only EXPENSES)
    const categorySpending = transactions
      .filter((t: TransactionForClient) => {
        return t.amount_number < 0 && t.category && t.category.groupType === "EXPENSES"
      })
      .reduce(
        (acc: Record<string, number>, t: TransactionForClient) => {
          const categoryName = t.category?.name || "Uncategorized"
          if (!acc[categoryName]) {
            acc[categoryName] = 0
          }
          acc[categoryName] += Math.abs(t.amount_number)
          return acc
        },
        {} as Record<string, number>,
      )

    const CHART_COLORS = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]

    const spendingByCategory = Object.entries(categorySpending)
      .map(([name, value], index) => ({
        name,
        value: value as number,
        color: CHART_COLORS[index % CHART_COLORS.length] as string,
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10) // Top 10 categories

    // Spending by Subcategory (all filtered transactions, only EXPENSES)
    const subcategorySpending = transactions
      .filter((t: TransactionForClient) => {
        return t.amount_number < 0 && t.subcategory && t.category && t.category.groupType === "EXPENSES"
      })
      .reduce(
        (acc: Record<string, number>, t: TransactionForClient) => {
          const subcategoryName = t.subcategory?.name || "Uncategorized"
          if (!acc[subcategoryName]) {
            acc[subcategoryName] = 0
          }
          acc[subcategoryName] += Math.abs(t.amount_number)
          return acc
        },
        {} as Record<string, number>,
      )

    const spendingBySubcategory = Object.entries(subcategorySpending)
      .map(([name, value], index) => ({
        name,
        value: value as number,
        color: CHART_COLORS[index % CHART_COLORS.length] as string,
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10) // Top 10 subcategories

    // Monthly trend data
    const monthlyTrendData = months.map((month) => {
      const monthStart = dateStartOfMonth(month)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      const startStr = dateToString(monthStart)
      const endStr = dateToString(monthEnd)

      const monthTransactions = transactions.filter((t: TransactionForClient) => {
        const transactionDate = getTransactionDate(t.datetime)
        return transactionDate >= startStr && transactionDate <= endStr
      })

      const spending = monthTransactions
        .filter((t: TransactionForClient) => t.amount_number < 0)
        .reduce((sum: number, t: TransactionForClient) => sum + Math.abs(t.amount_number), 0)

      const income = monthTransactions
        .filter((t: TransactionForClient) => t.amount_number > 0)
        .reduce((sum: number, t: TransactionForClient) => sum + t.amount_number, 0)

      return {
        month: format(month, "MMM yy"),
        spending,
        income,
      }
    })

    // Income vs Expense data
    const incomeVsExpenseData = months.map((month) => {
      const monthStart = dateStartOfMonth(month)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      const startStr = dateToString(monthStart)
      const endStr = dateToString(monthEnd)

      const monthTransactions = transactions.filter((t: TransactionForClient) => {
        const transactionDate = getTransactionDate(t.datetime)
        return transactionDate >= startStr && transactionDate <= endStr
      })

      const expenses = monthTransactions
        .filter((t: TransactionForClient) => t.amount_number < 0)
        .reduce((sum: number, t: TransactionForClient) => sum + Math.abs(t.amount_number), 0)

      const income = monthTransactions
        .filter((t: TransactionForClient) => t.amount_number > 0)
        .reduce((sum: number, t: TransactionForClient) => sum + t.amount_number, 0)

      return {
        month: format(month, "MMM yy"),
        income,
        expenses,
      }
    })

    // Cashflow Sankey data
    const cashflowMappedTransactions = transactions.map((t) => ({
      amount_number: t.amount_number,
      datetime: t.datetime,
      category: t.category
        ? {
            id: t.category.id,
            name: t.category.name,
            imageUrl: t.category.imageUrl ?? null,
            groupType: t.category.groupType ?? null,
            created_at_string: t.category.created_at_string ?? null,
            updated_at_string: t.category.updated_at_string ?? null,
          }
        : null,
      subcategory: t.subcategory
        ? {
            id: t.subcategory.id,
            categoryId: t.subcategory.categoryId ?? "",
            name: t.subcategory.name,
            imageUrl: t.subcategory.imageUrl ?? null,
            created_at_string: t.subcategory.created_at_string ?? null,
            updated_at_string: t.subcategory.updated_at_string ?? null,
          }
        : null,
    }))
    const cashflowData = prepareCashflowSankeyData(cashflowMappedTransactions)

    return {
      spendingByCategory,
      spendingBySubcategory,
      monthlyTrendData,
      incomeVsExpenseData,
      cashflowData,
    }
  }, [transactions, categories])

  return (
    <div className="space-y-6">
      <CashflowSankeyChart data={chartData.cashflowData} />
      <SpendingByCategoryChart data={chartData.spendingByCategory} title="Spending by Category" />
      <SpendingByCategoryChart data={chartData.spendingBySubcategory} title="Spending by Sub-Category" />
      <MonthlyTrendChart data={chartData.monthlyTrendData} />
      <IncomeVsExpenseChart data={chartData.incomeVsExpenseData} />
    </div>
  )
}
