"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { TransactionsPageClient } from "./TransactionsPageClient"
import { TransactionsPageSkeleton } from "./TransactionsPageSkeleton"
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params"
import type { TransactionForClient, CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"

interface TransactionsPageConvexProps {
  initialFilters?: TransactionFiltersFromUrl
}

export function TransactionsPageConvex({ initialFilters }: TransactionsPageConvexProps) {
  const transactions = useQuery(api.transactions.getAll)
  const categories = useQuery(api.categories.getAll)
  const tags = useQuery(api.tags.getAll)
  const accounts = useQuery(api.accounts.getAll)

  // Show skeleton while loading
  if (transactions === undefined || categories === undefined || tags === undefined || accounts === undefined) {
    return <TransactionsPageSkeleton />
  }

  // Transform data to match expected types
  const transformedTransactions: TransactionForClient[] = transactions.map((t) => ({
    ...t,
    amount_number: t.amount_number ?? 0,
  })) as TransactionForClient[]

  const transformedCategories: CategoryForClient[] = categories as CategoryForClient[]
  const transformedTags: TagForClient[] = tags as TagForClient[]
  const transformedAccounts: PlaidAccountForClient[] = accounts as PlaidAccountForClient[]

  return (
    <TransactionsPageClient
      transactions={transformedTransactions}
      categories={transformedCategories}
      tags={transformedTags}
      accounts={transformedAccounts}
      initialFilters={initialFilters}
    />
  )
}
