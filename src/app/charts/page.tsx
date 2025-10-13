import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ChartsView } from '@/components/ChartsView'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financial Charts',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ChartsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    include: {
      account: true,
      customCategory: true,
      customSubcategory: {
        include: {
          category: true,
        },
      },
    },
  })

  // Serialize transactions to make them compatible with client components
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount.toString(),
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account ? {
      ...t.account,
      currentBalance: t.account.currentBalance?.toString() || null,
      availableBalance: t.account.availableBalance?.toString() || null,
      creditLimit: t.account.creditLimit?.toString() || null,
      balanceUpdatedAt: t.account.balanceUpdatedAt?.toISOString() || null,
      createdAt: t.account.createdAt.toISOString(),
      updatedAt: t.account.updatedAt.toISOString(),
    } : null,
    customCategory: t.customCategory ? {
      ...t.customCategory,
      createdAt: t.customCategory.createdAt.toISOString(),
      updatedAt: t.customCategory.updatedAt.toISOString(),
    } : null,
    customSubcategory: t.customSubcategory ? {
      ...t.customSubcategory,
      createdAt: t.customSubcategory.createdAt.toISOString(),
      updatedAt: t.customSubcategory.updatedAt.toISOString(),
      category: t.customSubcategory.category ? {
        ...t.customSubcategory.category,
        createdAt: t.customSubcategory.category.createdAt.toISOString(),
        updatedAt: t.customSubcategory.category.updatedAt.toISOString(),
      } : undefined,
    } : null,
  }))

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Financial Charts</h1>
        <p className="text-gray-600 mt-1">Visualize your spending and income patterns</p>
      </div>

      <ChartsView transactions={serializedTransactions} />
    </div>
  )
}
