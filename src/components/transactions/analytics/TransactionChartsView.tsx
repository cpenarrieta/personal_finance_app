"use client"

import { useMemo } from "react"
import { format, startOfMonth as dateStartOfMonth, eachMonthOfInterval, min, max } from "date-fns"
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart"
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart"
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart"
import type { TransactionForClient, CategoryForClient } from "@/types"

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
      }
    }

    // Get date range from filtered transactions
    const transactionDates = transactions.map((t) => new Date(t.datetime || t.created_at_string))
    const minDate = min(transactionDates)
    const maxDate = max(transactionDates)

    // Generate months for the filtered date range
    const months = eachMonthOfInterval({
      start: dateStartOfMonth(minDate),
      end: dateStartOfMonth(maxDate),
    })

    // Spending by Category (all filtered transactions, exclude transfers)
    const categorySpending = transactions
      .filter((t: TransactionForClient) => {
        return t.amount_number < 0 && t.category && t.category.name !== "🔁 Transfers"
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

    // Spending by Subcategory (all filtered transactions, exclude transfers)
    const subcategorySpending = transactions
      .filter((t: TransactionForClient) => {
        return t.amount_number < 0 && t.subcategory && t.category && t.category.name !== "🔁 Transfers"
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

      const monthTransactions = transactions.filter((t: TransactionForClient) => {
        const transactionDate = new Date(t.datetime || t.created_at_string)
        return transactionDate >= monthStart && transactionDate <= monthEnd
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

      const monthTransactions = transactions.filter((t: TransactionForClient) => {
        const transactionDate = new Date(t.datetime || t.created_at_string)
        return transactionDate >= monthStart && transactionDate <= monthEnd
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

    return {
      spendingByCategory,
      spendingBySubcategory,
      monthlyTrendData,
      incomeVsExpenseData,
    }
  }, [transactions, categories])

  return (
    <div className="space-y-6">
      <SpendingByCategoryChart data={chartData.spendingByCategory} title="Spending by Category" />
      <SpendingByCategoryChart data={chartData.spendingBySubcategory} title="Spending by Sub-Category" />
      <MonthlyTrendChart data={chartData.monthlyTrendData} />
      <IncomeVsExpenseChart data={chartData.incomeVsExpenseData} />
    </div>
  )
}
