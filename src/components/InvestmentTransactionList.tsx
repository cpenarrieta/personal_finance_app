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
          <div className="font-medium">
            {t.name || t.type} — {t.security?.tickerSymbol || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">
            {t.date.toISOString().slice(0, 10)} · Type: {t.type}
            {showAccount && t.account && ` · ${t.account.name}`}
          </div>
          {t.quantity && <div className="text-sm">Quantity: {t.quantity.toString()}</div>}
          {t.amount && <div className="text-sm">Amount: {t.amount.toString()}</div>}
          {t.price && <div className="text-sm">Price: {t.price.toString()}</div>}
        </li>
      ))}
    </ul>
  )
}
