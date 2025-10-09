import type { Holding, Security, Account } from '@prisma/client'

type HoldingWithRelations = Holding & {
  security: Security
  account?: Account
}

interface HoldingListProps {
  holdings: HoldingWithRelations[]
  showAccount?: boolean
}

export function HoldingList({ holdings, showAccount = false }: HoldingListProps) {
  if (holdings.length === 0) {
    return <p className="text-gray-500">No holdings found.</p>
  }

  return (
    <ul className="space-y-2">
      {holdings.map(h => (
        <li key={h.id} className="border p-3 rounded">
          <div className="font-medium">
            {h.security.tickerSymbol || h.security.name} — {h.quantity.toString()} shares
          </div>
          <div className="text-sm text-gray-600">
            {showAccount && h.account && `${h.account.name} · `}
            {h.isoCurrencyCode}
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
  )
}
