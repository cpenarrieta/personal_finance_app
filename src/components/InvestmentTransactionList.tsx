import type { InvestmentTransaction, Security, Account } from '@prisma/client'

type InvestmentTransactionWithRelations = InvestmentTransaction & {
  security?: Security | null
  account?: Account
}

interface InvestmentTransactionListProps {
  transactions: InvestmentTransactionWithRelations[]
  showAccount?: boolean
}

export function InvestmentTransactionList({ transactions, showAccount = false }: InvestmentTransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-gray-500">No investment transactions found.</p>
  }

  return (
    <ul className="space-y-2">
      {transactions.map(t => (
        <li key={t.id} className="border p-3 rounded">
          <div className="flex items-start gap-3">
            {t.security?.logoUrl && (
              <img
                src={t.security.logoUrl}
                alt={t.security.tickerSymbol || ''}
                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {t.name || t.type} — {t.security?.tickerSymbol || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">
                {t.date.toISOString().slice(0, 10)} · Type: {t.type}
                {showAccount && t.account && ` · ${t.account.name}`}
              </div>
              {t.quantity && <div className="text-sm">Quantity: {t.quantity.toNumber().toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}</div>}
              {t.amount && <div className="text-sm">Amount: {t.amount.toNumber().toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</div>}
              {t.price && <div className="text-sm">Price: {t.price.toNumber().toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</div>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
