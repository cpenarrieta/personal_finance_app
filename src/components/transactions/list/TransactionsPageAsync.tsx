import { TransactionsPageClient } from "./TransactionsPageClient"
import { getAllTransactions, getAllCategories, getAllTags, getAllAccounts } from "@/lib/db/queries"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import type { TransactionForClient, CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params"

interface TransactionsPageAsyncProps {
  initialFilters?: TransactionFiltersFromUrl
}

/**
 * Async Server Component for Transactions Page
 * Fetches all data using cached queries, then renders client component
 */
export async function TransactionsPageAsync({ initialFilters }: TransactionsPageAsyncProps) {
  try {
    const [transactions, categories, tags, accounts] = await Promise.all([
      getAllTransactions(),
      getAllCategories(),
      getAllTags(),
      getAllAccounts(),
    ])

    // Transform data to match expected types
    const transformedTransactions: TransactionForClient[] = transactions.map((t) => ({
      ...t,
      amount_number: t.amount_number ?? 0,
    })) as TransactionForClient[]

    return (
      <TransactionsPageClient
        transactions={transformedTransactions}
        categories={categories as CategoryForClient[]}
        tags={tags as TagForClient[]}
        accounts={accounts as PlaidAccountForClient[]}
        initialFilters={initialFilters}
      />
    )
  } catch (error) {
    logError("Failed to load transactions page:", error)
    return (
      <ErrorFallback
        error={error as Error}
        title="Failed to load transactions"
        description="Unable to fetch transaction data"
      />
    )
  }
}
