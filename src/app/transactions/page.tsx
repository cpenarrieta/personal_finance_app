import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SearchableTransactionList } from '@/components/SearchableTransactionList'
import { TRANSACTION_INCLUDE, serializeTransaction } from '@/types/transaction'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Banking Transactions',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function TransactionsPage() {
  // Fetch all data in parallel on the server
  const [txs, categories, tags] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: 'desc' },
      include: TRANSACTION_INCLUDE,
    }),
    prisma.customCategory.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  // Serialize transactions for client component
  const serializedTransactions = txs.map(serializeTransaction)
  
  // Serialize categories and tags (convert dates to strings if needed)
  const serializedCategories = categories.map(cat => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    subcategories: cat.subcategories.map(sub => ({
      ...sub,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }))
  
  const serializedTags = tags.map(tag => ({
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }))

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Banking Transactions</h1>
        <p className="text-gray-600 mt-1">View and search all your banking transactions</p>
      </div>

      <SearchableTransactionList 
        transactions={serializedTransactions} 
        categories={serializedCategories}
        tags={serializedTags}
      />
    </div>
  )
}
