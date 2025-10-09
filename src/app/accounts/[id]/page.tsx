import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TransactionList } from '@/components/TransactionList'
import { InvestmentTransactionList } from '@/components/InvestmentTransactionList'
import { HoldingList } from '@/components/HoldingList'

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const account = await prisma.account.findUnique({
    where: { id: params.id },
    include: { item: true },
  })

  if (!account) {
    notFound()
  }

  // Check if this is an investment account
  const isInvestmentAccount = account.type === 'investment' || account.subtype?.includes('brokerage')

  // Fetch transactions or investment data based on account type
  let transactions: any[] = []
  let investmentTransactions: any[] = []
  let holdings: any[] = []

  if (isInvestmentAccount) {
    // Fetch investment transactions
    investmentTransactions = await prisma.investmentTransaction.findMany({
      where: { accountId: account.id },
      include: { security: true },
      orderBy: { date: 'desc' },
    })

    // Fetch holdings
    holdings = await prisma.holding.findMany({
      where: { accountId: account.id },
      include: { security: true },
    })
  } else {
    // Fetch regular banking transactions
    transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { date: 'desc' },
    })
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/accounts" className="text-blue-600 hover:underline">
          ← Back to Accounts
        </Link>
      </div>

      {/* Account Header */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold">
          {account.name} {account.mask ? `• ${account.mask}` : ''}
        </h2>
        <div className="text-sm text-gray-600 mt-1">
          {account.type}
          {account.subtype ? ` / ${account.subtype}` : ''} · {account.currency}
        </div>
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
          <TransactionList transactions={transactions} />
        </div>
      )}
    </div>
  )
}
