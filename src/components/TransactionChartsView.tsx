"use client"

import { useMemo } from "react"
import { format, startOfMonth as dateStartOfMonth, subMonths, eachMonthOfInterval } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpendingByCategoryChart } from "@/components/charts/SpendingByCategoryChart"
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart"
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart"
import type { TransactionForClient, CategoryForClient } from "@/types"

interface TransactionChartsViewProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
}

export function TransactionChartsView({
  transactions,
  categories,
}: TransactionChartsViewProps) {
  const chartData = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = subMonths(now, 6)
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now })

    // Spending by Category (current month, exclude transfers)
    const categorySpending = transactions
      .filter((t: TransactionForClient) => {
        const transactionDate = new Date(t.date_string || t.created_at_string)
        return (
          transactionDate >= startOfMonth &&
          t.amount_number < 0 &&
          t.category &&
          t.category.name !== "🔁 Transfers"
        )
      })
      .reduce((acc: Record<string, number>, t: TransactionForClient) => {
        const categoryName = t.category?.name || "Uncategorized"
        if (!acc[categoryName]) {
          acc[categoryName] = 0
        }
        acc[categoryName] += Math.abs(t.amount_number)
        return acc
      }, {} as Record<string, number>)

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

    // Monthly trend data
    const monthlyTrendData = months.map((month) => {
      const monthStart = dateStartOfMonth(month)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const monthTransactions = transactions.filter((t: TransactionForClient) => {
        const transactionDate = new Date(t.date_string || t.created_at_string)
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
        const transactionDate = new Date(t.date_string || t.created_at_string)
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

    // Account breakdown
    const accountSpending = transactions
      .filter((t: TransactionForClient) => {
        const transactionDate = new Date(t.date_string || t.created_at_string)
        return transactionDate >= startOfMonth && t.amount_number < 0
      })
      .reduce((acc: Record<string, number>, t: TransactionForClient) => {
        const accountName = t.account?.name || "Unknown"
        if (!acc[accountName]) {
          acc[accountName] = 0
        }
        acc[accountName] += Math.abs(t.amount_number)
        return acc
      }, {} as Record<string, number>)

    const spendingByAccount = Object.entries(accountSpending)
      .map(([name, value], index) => ({
        name,
        value: value as number,
        color: CHART_COLORS[index % CHART_COLORS.length] as string,
      }))
      .sort((a, b) => (b.value as number) - (a.value as number))

    return {
      spendingByCategory,
      monthlyTrendData,
      incomeVsExpenseData,
      spendingByAccount,
    }
  }, [transactions, categories])

  return (
    <div className="space-y-4">
      <Tabs defaultValue="category" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="income-expense">Income vs Expense</TabsTrigger>
          <TabsTrigger value="account">By Account</TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="mt-4">
          <SpendingByCategoryChart data={chartData.spendingByCategory} />
        </TabsContent>
        <TabsContent value="trend" className="mt-4">
          <MonthlyTrendChart data={chartData.monthlyTrendData} />
        </TabsContent>
        <TabsContent value="income-expense" className="mt-4">
          <IncomeVsExpenseChart data={chartData.incomeVsExpenseData} />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <SpendingByCategoryChart data={chartData.spendingByAccount} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
