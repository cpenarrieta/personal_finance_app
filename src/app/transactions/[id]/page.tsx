import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { TransactionDetailView } from '@/components/TransactionDetailView'
import { headers } from 'next/headers'

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headersList = await headers()
  const referer = headersList.get('referer') || ''

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      account: true,
      customCategory: true,
      customSubcategory: true,
    },
  })

  if (!transaction) {
    notFound()
  }

  // Serialize transaction for client component
  const serializedTransaction = {
    id: transaction.id,
    plaidTransactionId: transaction.plaidTransactionId,
    accountId: transaction.accountId,
    amount: transaction.amount.toString(),
    isoCurrencyCode: transaction.isoCurrencyCode,
    date: transaction.date.toISOString(),
    authorizedDate: transaction.authorizedDate?.toISOString() || null,
    pending: transaction.pending,
    merchantName: transaction.merchantName,
    name: transaction.name,
    category: transaction.category,
    subcategory: transaction.subcategory,
    paymentChannel: transaction.paymentChannel,
    pendingTransactionId: transaction.pendingTransactionId,
    logoUrl: transaction.logoUrl,
    categoryIconUrl: transaction.categoryIconUrl,
    customCategoryId: transaction.customCategoryId,
    customSubcategoryId: transaction.customSubcategoryId,
    notes: transaction.notes,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    account: transaction.account ? {
      id: transaction.account.id,
      name: transaction.account.name,
      type: transaction.account.type,
      mask: transaction.account.mask,
    } : null,
    customCategory: transaction.customCategory ? {
      id: transaction.customCategory.id,
      name: transaction.customCategory.name,
    } : null,
    customSubcategory: transaction.customSubcategory ? {
      id: transaction.customSubcategory.id,
      name: transaction.customSubcategory.name,
    } : null,
  }

  // Determine which page to go back to based on referrer
  const isFromAnalytics = referer.includes('/analytics')
  const backUrl = isFromAnalytics ? '/analytics' : '/transactions'
  const backText = isFromAnalytics ? '← Back to Analytics' : '← Back to Transactions'

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href={backUrl} className="text-blue-600 hover:underline">
          {backText}
        </Link>
      </div>

      <TransactionDetailView transaction={serializedTransaction} />
    </div>
  )
}
