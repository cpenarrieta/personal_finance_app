import { TransactionsPageClient } from "@/components/transactions/list/TransactionsPageClient"
import { TransactionsPageSkeleton } from "@/components/transactions/list/TransactionsPageSkeleton"
import type { Metadata } from "next"
import { Suspense } from "react"
import { getAllTransactions, getAllCategories, getAllTags, getAllAccounts } from "@/lib/db/queries"
import { parseTransactionFiltersFromUrl } from "@/lib/transactions/url-params"
import type { TransactionForClient } from "@/types"

export const metadata: Metadata = {
  title: "Banking Transactions",
  robots: {
    index: false,
    follow: false,
  },
}

interface TransactionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Async component that fetches all transaction data
 */
async function TransactionsData({
  initialFilters,
}: {
  initialFilters: ReturnType<typeof parseTransactionFiltersFromUrl>
}) {
  // Use cached queries for all data fetching
  const [transactions, categories, tags, accounts] = await Promise.all([
    getAllTransactions(),
    getAllCategories(),
    getAllTags(),
    getAllAccounts(),
  ] as const)

  // Flatten tags structure (tags.tag → tags) and assert type
  // Note: amount_number is a PostgreSQL generated column that's never null in practice
  const transactionsWithFlatTags = transactions.map((t) => ({
    ...t,
    amount_number: t.amount_number ?? 0, // Coerce to number for type safety
    tags: t.tags.map((tt) => tt.tag),
  })) as TransactionForClient[]

  return (
    <TransactionsPageClient
      transactions={transactionsWithFlatTags}
      categories={categories}
      tags={tags}
      accounts={accounts}
      initialFilters={initialFilters}
    />
  )
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams
  const initialFilters = parseTransactionFiltersFromUrl(params)

  return (
    <Suspense fallback={<TransactionsPageSkeleton />}>
      <TransactionsData initialFilters={initialFilters} />
    </Suspense>
  )
}
