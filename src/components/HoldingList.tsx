import type { HoldingWithRelations } from "@/types";
import Image from "next/image";

interface HoldingListProps {
  holdings: HoldingWithRelations[];
  showAccount?: boolean;
}

export function HoldingList({
  holdings,
  showAccount = false,
}: HoldingListProps) {
  if (holdings.length === 0) {
    return <p className="text-gray-500">No holdings found.</p>;
  }

  // Calculate totals by currency
  const totalsByCurrency: Record<string, number> = {};

  holdings.forEach((h) => {
    if (h.institutionPrice && h.isoCurrencyCode) {
      const value = parseInt(h.quantity) * parseFloat(h.institutionPrice);
      const currency = h.isoCurrencyCode;
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + value;
    }
  });

  return (
    <div>
      {/* Totals Summary */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">Portfolio Value</h3>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, total]) => (
              <div key={currency} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{currency}:</span>
                <span className="font-medium text-lg">
                  {total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {currency}
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
              {h.security.logoUrl && (
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
                  {h.security.tickerSymbol || h.security.name} —{" "}
                  {parseInt(h.quantity, 10).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}{" "}
                  shares
                </div>
                <div className="text-sm text-gray-600">
                  {showAccount && h.account && `${h.account.name} · `}
                  {h.isoCurrencyCode}
                </div>
                {h.costBasis && (
                  <div className="text-sm">
                    Cost Basis:{" "}
                    {parseFloat(h.costBasis).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
                {h.institutionPrice && (
                  <div className="text-sm">
                    Price:{" "}
                    {parseFloat(h.institutionPrice).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
