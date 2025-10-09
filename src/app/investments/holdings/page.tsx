import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function HoldingsPage() {
  const holdings = await prisma.holding.findMany({
    include: { account: true, security: true },
  })
  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Holdings (current snapshot)</h2>
      {holdings.length === 0 ? (
        <p className="text-gray-500">No holdings found. Connect your bank and run sync.</p>
      ) : (
        <ul className="space-y-2">
          {holdings.map(h => (
            <li key={h.id} className="border p-3 rounded">
              <div className="font-medium">
                {h.security.tickerSymbol || h.security.name} — {h.quantity.toString()} shares
              </div>
              <div className="text-sm text-gray-600">
                {h.account.name} · {h.isoCurrencyCode}
              </div>
              {h.costBasis && <div className="text-sm">Cost Basis: {h.costBasis.toString()}</div>}
              {h.institutionPrice && (
                <div className="text-sm">
                  Price: {h.institutionPrice.toString()}
                  {h.institutionPriceAsOf && ` (as of ${h.institutionPriceAsOf.toISOString().slice(0, 10)})`}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
