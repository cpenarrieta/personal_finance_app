import type { HoldingForClient } from "@/types"
import Image from "next/image"
import { formatAmount } from "@/lib/utils"

interface HoldingListProps {
  holdings: HoldingForClient[]
  showAccount?: boolean
}

export function HoldingList({ holdings, showAccount = false }: HoldingListProps) {
  if (holdings.length === 0) {
    return <p className="text-muted-foreground">No holdings found.</p>
  }

  // Calculate totals by currency
  const totalsByCurrency: Record<string, number> = {}

  holdings.forEach((h) => {
    if (h.institution_price_number != null && h.quantity_number != null && h.isoCurrencyCode) {
      const value = h.quantity_number * h.institution_price_number
      const currency = h.isoCurrencyCode
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + value
    }
  })

  return (
    <div>
      {/* Totals Summary */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <h3 className="font-semibold mb-2">Portfolio Value</h3>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, total]) => (
              <div key={currency} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{currency}:</span>
                <span className="font-medium text-lg">
                  {formatAmount(total)} {currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holdings List */}
      <ul className="space-y-2">
        {holdings.map((h) => (
          <li key={h.id} className="border p-3 rounded">
            <div className="flex items-start gap-3">
              {h.security?.logoUrl && (
                <Image
                  src={h.security.logoUrl}
                  alt={h.security.tickerSymbol || ""}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded object-cover flex-shrink-0 mt-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {h.security?.tickerSymbol || h.security?.name || "Unknown Security"} —{" "}
                  {h.quantity_number != null
                    ? h.quantity_number.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })
                    : "0"}{" "}
                  shares
                </div>
                <div className="text-sm text-muted-foreground">
                  {showAccount && h.account && `${h.account.name} · `}
                  {h.isoCurrencyCode}
                </div>
                {h.cost_basis_number != null && (
                  <div className="text-sm">Cost Basis: {formatAmount(h.cost_basis_number)}</div>
                )}
                {h.institution_price_number != null && (
                  <div className="text-sm">Price: {formatAmount(h.institution_price_number)}</div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
