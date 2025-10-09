import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TransactionList } from '@/components/TransactionList'

export default async function TransactionsPage() {
  const txs = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    include: { account: true },
  })
  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Banking Transactions</h2>
      <TransactionList transactions={txs} showAccount={true} />
    </div>
  )
}
