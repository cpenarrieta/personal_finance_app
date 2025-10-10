import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TransactionAnalytics } from '@/components/TransactionAnalytics'

export default async function AnalyticsPage() {
  // Fetch all transactions with their Plaid categories
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    include: {
      account: true,
    },
  })

  // Serialize transactions to make them compatible with client components
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount.toString(), // Convert Decimal to string
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account ? {
      ...t.account,
      createdAt: t.account.createdAt.toISOString(),
      updatedAt: t.account.updatedAt.toISOString(),
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
        <h1 className="text-3xl font-bold text-gray-900">Transaction Analytics</h1>
        <p className="text-gray-600 mt-1">Analyze your spending patterns by Plaid category and time</p>
      </div>

      <TransactionAnalytics transactions={serializedTransactions} />
    </div>
  )
}
