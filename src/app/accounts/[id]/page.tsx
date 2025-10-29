import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SearchableTransactionList } from '@/components/SearchableTransactionList'
import { InvestmentTransactionList } from '@/components/InvestmentTransactionList'
import { HoldingList } from '@/components/HoldingList'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import type { InvestmentTransactionWithRelations, HoldingWithRelations, TransactionForClient, CategoryForClient, TagForClient } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const account = await prisma.plaidAccount.findUnique({
    where: { id },
  })
  
  if (!account) {
    return {
      title: 'Account Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }
  
  return {
    title: `${account.name}${account.mask ? ` • ${account.mask}` : ''}`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = await prisma.plaidAccount.findUnique({
    where: { id },
    include: { item: true },
  })

  if (!account) {
    notFound()
  }

  // Check if this is an investment account
  const isInvestmentAccount = account.type === 'investment' || account.subtype?.includes('brokerage')

  // Fetch transactions or investment data based on account type
  let transactions: TransactionForClient[] = []
  let investmentTransactions: InvestmentTransactionWithRelations[] = []
  let holdings: HoldingWithRelations[] = []

  if (isInvestmentAccount) {
    // Fetch investment transactions
    investmentTransactions = await prisma.investmentTransaction.findMany({
      where: { accountId: account.id },
      include: { security: true, account: true },
      orderBy: { date: 'desc' },
    })

    // Fetch holdings
    holdings = await prisma.holding.findMany({
      where: { accountId: account.id },
      include: { security: true, account: true },
    })
  } else {
    // Fetch regular banking transactions
    const txs = await prisma.transaction.findMany({
      where: {
        accountId: account.id,
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        plaidTransactionId: true,
        accountId: true,
        amount_number: true, // Generated column
        isoCurrencyCode: true,
        date_string: true, // Generated column
        authorized_date_string: true, // Generated column
        pending: true,
        merchantName: true,
        name: true,
        plaidCategory: true,
        plaidSubcategory: true,
        paymentChannel: true,
        pendingTransactionId: true,
        logoUrl: true,
        categoryIconUrl: true,
        categoryId: true,
        subcategoryId: true,
        notes: true,
        isSplit: true,
        parentTransactionId: true,
        originalTransactionId: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            mask: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        subcategory: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                created_at_string: true, // Generated column
                updated_at_string: true, // Generated column
              },
            },
          },
        },
      },
    })

    // Flatten tags structure
    transactions = txs.map((t: typeof txs[0]) => ({
      ...t,
      tags: t.tags.map((tt: typeof t.tags[0]) => tt.tag),
    }))
  }

  // Fetch categories and tags (needed for transaction editing)
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        groupType: true,
        displayOrder: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
        subcategories: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }) as CategoryForClient[],
    prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
      },
      orderBy: { name: 'asc' },
    }) as TagForClient[],
  ])

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/accounts" className="text-blue-600 hover:underline">
          ← Back to Accounts
        </Link>
      </div>

      {/* Account Header */}
      <div className="mb-6 p-6 border rounded-lg bg-white shadow-md">
        <h2 className="text-2xl font-semibold mb-4">
          {account.name} {account.mask ? `• ${account.mask}` : ''}
        </h2>
        <div className="text-sm text-gray-600 mb-4">
          {account.type}
          {account.subtype ? ` / ${account.subtype}` : ''} · {account.currency}
        </div>

        {/* Balance Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {account.currentBalance !== null && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Current Balance</div>
              <div className="text-2xl font-bold text-blue-900">
                ${account.currentBalance.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {account.availableBalance !== null && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-700 mb-1">Available Balance</div>
              <div className="text-2xl font-bold text-green-900">
                ${account.availableBalance.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {account.creditLimit !== null && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-purple-700 mb-1">Credit Limit</div>
              <div className="text-2xl font-bold text-purple-900">
                ${account.creditLimit.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {account.balanceUpdatedAt && (
          <div className="text-xs text-gray-500 mt-4">
            Balance last updated: {format(new Date(account.balanceUpdatedAt), 'MMM d yyyy h:mm a')}
          </div>
        )}
      </div>

      {/* Display content based on account type */}
      {isInvestmentAccount ? (
        <div className="space-y-6">
          {/* Holdings Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Holdings</h3>
            <HoldingList holdings={holdings} />
          </div>

          {/* Investment Transactions Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Investment Transactions</h3>
            <InvestmentTransactionList transactions={investmentTransactions} />
          </div>
        </div>
      ) : (
        /* Banking Transactions Section */
        <div>
          <h3 className="text-lg font-semibold mb-3">Transactions</h3>
          <SearchableTransactionList
            transactions={transactions}
            showAccount={false}
            categories={categories}
            tags={tags}
          />
        </div>
      )}
    </div>
  )
}
