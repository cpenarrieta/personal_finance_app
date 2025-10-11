import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SearchableTransactionList } from '@/components/SearchableTransactionList'

export default async function TransactionsPage() {
  const txs = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    include: { account: true },
  })

  // Serialize transactions for client component
  const serializedTransactions = txs.map(t => ({
    id: t.id,
    plaidTransactionId: t.plaidTransactionId,
    accountId: t.accountId,
    amount: t.amount.toString(),
    isoCurrencyCode: t.isoCurrencyCode,
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString() || null,
    pending: t.pending,
    merchantName: t.merchantName,
    name: t.name,
    category: t.category,
    subcategory: t.subcategory,
    paymentChannel: t.paymentChannel,
    pendingTransactionId: t.pendingTransactionId,
    logoUrl: t.logoUrl,
    categoryIconUrl: t.categoryIconUrl,
    customCategoryId: t.customCategoryId,
    customSubcategoryId: t.customSubcategoryId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account ? {
      id: t.account.id,
      name: t.account.name,
      type: t.account.type,
      mask: t.account.mask,
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
        <h1 className="text-3xl font-bold text-gray-900">Banking Transactions</h1>
        <p className="text-gray-600 mt-1">View and search all your banking transactions</p>
      </div>

      <SearchableTransactionList transactions={serializedTransactions} />
    </div>
  )
}
