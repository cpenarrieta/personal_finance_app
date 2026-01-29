import { Suspense } from "react"
import type { Metadata } from "next"
import { TransactionsPageAsync } from "@/components/transactions/list/TransactionsPageAsync"
import { TransactionsPageSkeleton } from "@/components/transactions/list/TransactionsPageSkeleton"
import { parseTransactionFiltersFromUrl } from "@/lib/transactions/url-params"

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

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams
  const initialFilters = parseTransactionFiltersFromUrl(params)

  return (
    <Suspense fallback={<TransactionsPageSkeleton />}>
      <TransactionsPageAsync initialFilters={initialFilters} />
    </Suspense>
  )
}
