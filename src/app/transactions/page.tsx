import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TransactionsPageClient } from '@/components/TransactionsPageClient'
import {
  serializeTransaction,
  serializeCustomCategory,
  serializeTag,
  serializePlaidAccount,
} from '@/types'
import { PrismaIncludes } from '@/types/prisma'
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
  const [txs, categories, tags, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: 'desc' },
      include: PrismaIncludes.transaction,
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
    prisma.plaidAccount.findMany({
      orderBy: { name: 'asc' },
    }),
  ])

  // Serialize all data for client components
  const serializedTransactions = txs.map(serializeTransaction)
  const serializedCategories = categories.map(serializeCustomCategory)
  const serializedTags = tags.map(serializeTag)
  const serializedAccounts = accounts.map(serializePlaidAccount)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <TransactionsPageClient
        transactions={serializedTransactions}
        categories={serializedCategories}
        tags={serializedTags}
        accounts={serializedAccounts}
      />
    </div>
  )
}
