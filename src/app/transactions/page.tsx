import { prisma } from '@/lib/prisma'
import Link from 'next/link'

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
      {txs.length === 0 ? (
        <p className="text-gray-500">No transactions found. Connect your bank and run sync.</p>
      ) : (
        <ul className="space-y-2">
          {txs.map(t => (
            <li key={t.id} className="border p-3 rounded">
              <div className="flex items-start gap-3">
                {(t.logoUrl || t.categoryIconUrl) && (
                  <img
                    src={t.logoUrl || t.categoryIconUrl || ''}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {t.name} — {t.amount.toString()} {t.isoCurrencyCode}
                    {t.pending && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Pending</span>}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t.date.toISOString().slice(0, 10)} · {t.account.name}
                  </div>
                  {t.merchantName && <div className="text-sm">Merchant: {t.merchantName}</div>}
                  {t.category && <div className="text-sm text-gray-500">Category: {t.category}</div>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
