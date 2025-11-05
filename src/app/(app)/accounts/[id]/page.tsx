import { notFound } from 'next/navigation'
import { SearchableTransactionList } from '@/components/SearchableTransactionList'
import { InvestmentTransactionList } from '@/components/InvestmentTransactionList'
import { HoldingList } from '@/components/HoldingList'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import type { InvestmentTransactionWithRelations, HoldingWithRelations, TransactionForClient, CategoryForClient, TagForClient } from '@/types'
import {
  getAccountById,
  getTransactionsForAccount,
  getHoldingsForAccount,
  getInvestmentTransactionsForAccount,
  getAllCategories,
  getAllTags,
} from '@/lib/cached-queries'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const account = await getAccountById(id)

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
  const account = await getAccountById(id)

  if (!account) {
    notFound()
  }

  // Check if this is an investment account
  const isInvestmentAccount = account.type === 'investment' || account.subtype?.includes('brokerage')

  // Fetch transactions or investment data based on account type using cached queries
  let transactions: TransactionForClient[] = []
  let investmentTransactions: InvestmentTransactionWithRelations[] = []
  let holdings: HoldingWithRelations[] = []

  if (isInvestmentAccount) {
    // Fetch investment data using cached queries
    [investmentTransactions, holdings] = await Promise.all([
      getInvestmentTransactionsForAccount(account.id),
      getHoldingsForAccount(account.id),
    ])
  } else {
    // Fetch regular banking transactions using cached queries
    const txs = await getTransactionsForAccount(account.id)

    // Flatten tags structure
    transactions = txs.map((t: typeof txs[0]) => ({
      ...t,
      tags: t.tags.map((tt: typeof t.tags[0]) => tt.tag),
    }))
  }

  // Fetch categories and tags using cached queries (needed for transaction editing)
  const [categories, tags] = await Promise.all([
    getAllCategories(),
    getAllTags(),
  ])

  return (
    <>
      <div>
        {/* Account Header */}
        <div className="mb-6 p-6 border rounded-lg bg-card shadow-md">
        <h2 className="text-2xl font-semibold mb-4">
          {account.name} {account.mask ? `• ${account.mask}` : ''}
        </h2>
        <div className="text-sm text-muted-foreground mb-4">
          {account.type}
          {account.subtype ? ` / ${account.subtype}` : ''} · {account.currency}
        </div>

        {/* Balance Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {account.currentBalance !== null && (
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <div className="text-sm text-primary mb-1">Current Balance</div>
              <div className="text-2xl font-bold text-foreground">
                ${account.currentBalance.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {account.availableBalance !== null && (
            <div className="bg-success/10 rounded-lg p-4 border border-success/30">
              <div className="text-sm text-success mb-1">Available Balance</div>
              <div className="text-2xl font-bold text-foreground">
                ${account.availableBalance.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {account.creditLimit !== null && (
            <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/30">
              <div className="text-sm text-secondary mb-1">Credit Limit</div>
              <div className="text-2xl font-bold text-foreground">
                ${account.creditLimit.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {account.balanceUpdatedAt && (
          <div className="text-xs text-muted-foreground mt-4">
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
    </>
  )
}
