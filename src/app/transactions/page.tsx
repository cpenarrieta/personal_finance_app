import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TransactionsPageClient } from '@/components/TransactionsPageClient'
import { serializeTransaction } from '@/types/transaction'
import { PrismaIncludes, type CustomCategoryWithSubcategories } from '@/types/prisma'
import type { Tag, CustomSubcategory, PlaidAccount } from '@prisma/client'
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

  // Serialize transactions for client component
  const serializedTransactions = txs.map(serializeTransaction)

  // Serialize categories and tags (convert dates to strings if needed)
  const serializedCategories = categories.map((cat: CustomCategoryWithSubcategories) => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    subcategories: cat.subcategories.map((sub: CustomSubcategory) => ({
      ...sub,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }))

  const serializedTags = tags.map((tag: Tag) => ({
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }))

  // Serialize accounts for client component
  const serializedAccounts = accounts.map((account: PlaidAccount) => ({
    id: account.id,
    name: account.name,
    officialName: account.officialName,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    currency: account.currency,
  }))

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
