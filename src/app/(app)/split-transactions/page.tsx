import { SplitTransactionsClient } from "@/components/split-transactions/SplitTransactionsClient"
import { getAllCategories } from "@/lib/db/queries"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Split Transactions",
  description: "Split transactions using AI-powered receipt analysis",
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Server Component for AI-powered split transactions page
 * Fetches categories and passes to client component
 */
export default async function SplitTransactionsPage() {
  // Fetch categories for display (cached query)
  const categories = await getAllCategories()

  return <SplitTransactionsClient categories={categories} />
}
