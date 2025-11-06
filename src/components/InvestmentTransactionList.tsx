import type { InvestmentTransactionForClient } from '@/types'
import Image from 'next/image'
import { format } from 'date-fns'
import { formatAmount } from '@/lib/utils'

interface InvestmentTransactionListProps {
  transactions: InvestmentTransactionForClient[]
  showAccount?: boolean
}

export function InvestmentTransactionList({ transactions, showAccount = false }: InvestmentTransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No investment transactions found.</p>
  }

  return (
    <ul className="space-y-2">
      {transactions.map(t => (
        <li key={t.id} className="border p-3 rounded">
          <div className="flex items-start gap-3">
            {t.security?.logoUrl && (
              <Image
                src={t.security.logoUrl}
                alt={t.security.tickerSymbol || ''}
                width={32}
                height={32}
                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {t.name || t.type} — {t.security?.tickerSymbol || 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(t.date_string), 'MMM d yyyy')} · Type: {t.type}
                {showAccount && t.account && ` · ${t.account.name}`}
              </div>
              {t.quantity_number != null && <div className="text-sm">Quantity: {t.quantity_number.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}</div>}
              {t.amount_number != null && <div className="text-sm">Amount: {formatAmount(t.amount_number)}</div>}
              {t.price_number != null && <div className="text-sm">Price: {formatAmount(t.price_number)}</div>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
