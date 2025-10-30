import { format } from 'date-fns'
import Image from 'next/image'
import type { TransactionWithAccount } from '@/types/prisma'

interface TransactionListProps {
  transactions: TransactionWithAccount[]
  showAccount?: boolean
}

export function TransactionList({ transactions, showAccount = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground">No transactions found.</p>
  }

  return (
    <ul className="space-y-2">
      {transactions.map(t => (
        <li key={t.id} className="border p-3 rounded">
          <div className="flex items-start gap-3">
            {t.logoUrl && (
              <Image
                src={t.logoUrl}
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {t.name} — {t.amount.toNumber().toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {t.isoCurrencyCode}
                {t.pending && <span className="ml-2 text-xs bg-warning/10 text-warning-foreground px-2 py-1 rounded">Pending</span>}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(t.date, 'MMM d yyyy')}
                {showAccount && t.account && ` · ${t.account.name}`}
              </div>
              {t.merchantName && <div className="text-sm">Merchant: {t.merchantName}</div>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
