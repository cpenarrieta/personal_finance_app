"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/shared/MetricCard"
import { formatAmount } from "@/lib/utils"
import { Coins, DollarSign, TrendingUp, BarChart3 } from "lucide-react"

interface Security {
  id: string
  plaidSecurityId: string
  name: string | null
  tickerSymbol: string | null
  type: string | null
  isoCurrencyCode: string | null
  logoUrl: string | null
  created_at_string: string | null
  updated_at_string: string | null
}

interface Holding {
  id: string
  accountId: string
  securityId: string
  quantity_number: number
  cost_basis_number: number | null
  institution_price_number: number | null
  institution_price_as_of_string: string | null
  isoCurrencyCode: string | null
  account: {
    id: string
    plaidAccountId: string
    name: string
    type: string
    subtype: string | null
    mask: string | null
  } | null
}

interface Transaction {
  id: string
  plaidInvestmentTransactionId: string
  accountId: string
  securityId: string | null
  type: string
  amount_number: number | null
  price_number: number | null
  quantity_number: number | null
  fees_number: number | null
  isoCurrencyCode: string | null
  transactionDatetime: string | null
  name: string | null
  account: {
    id: string
    plaidAccountId: string
    name: string
    type: string
    subtype: string | null
    mask: string | null
  } | null
}

interface StockDetailProps {
  security: Security
  holdings: Holding[]
  transactions: Transaction[]
  ticker: string
}

export function StockDetail({ security, holdings, transactions, ticker }: StockDetailProps) {
  const price = holdings[0]?.institution_price_number ?? 0
  const priceAsOf = holdings[0]?.institution_price_as_of_string

  const accountBreakdown = useMemo(() => {
    return holdings.map((h) => {
      const qty = h.quantity_number ?? 0
      const costBasis = h.cost_basis_number ?? 0
      const marketValue = qty * price
      const avgCost = qty > 0 ? costBasis / qty : 0
      const gainLoss = marketValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      return {
        ...h,
        qty,
        costBasis,
        marketValue,
        avgCost,
        gainLoss,
        gainLossPercent,
      }
    })
  }, [holdings, price])

  const summary = useMemo(() => {
    const totalShares = accountBreakdown.reduce((sum, h) => sum + h.qty, 0)
    const totalMarketValue = accountBreakdown.reduce((sum, h) => sum + h.marketValue, 0)
    const totalCost = accountBreakdown.reduce((sum, h) => sum + h.costBasis, 0)
    const totalReturn = totalMarketValue - totalCost
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

    return { totalShares, totalMarketValue, totalCost, totalReturn, totalReturnPercent }
  }, [accountBreakdown])

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/investments/holdings" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {security.logoUrl && (
            <Image
              src={security.logoUrl}
              alt={ticker}
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{ticker}</h1>
              <a
                href={`https://finance.yahoo.com/quote/${ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-muted-foreground text-sm">{security.name}</p>
          </div>
          {security.type && (
            <Badge variant="secondary" className="capitalize">
              {security.type}
            </Badge>
          )}
        </div>
      </div>

      {/* Price Banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold text-foreground">${formatAmount(price)}</span>
            <span className={`text-lg font-semibold ${summary.totalReturn >= 0 ? "text-success" : "text-destructive"}`}>
              {summary.totalReturn >= 0 ? "+" : ""}${formatAmount(Math.abs(summary.totalReturn))}
            </span>
            <span className={`text-sm font-medium ${summary.totalReturn >= 0 ? "text-success" : "text-destructive"}`}>
              ({summary.totalReturn >= 0 ? "+" : ""}
              {summary.totalReturnPercent.toFixed(2)}%)
            </span>
          </div>
          {priceAsOf && (
            <p className="text-xs text-muted-foreground mt-1">
              as of{" "}
              {new Date(priceAsOf).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Shares"
          value={summary.totalShares.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          icon={Coins}
        />
        <MetricCard title="Market Value" value={`$${formatAmount(summary.totalMarketValue)}`} icon={BarChart3} />
        <MetricCard title="Total Cost" value={`$${formatAmount(summary.totalCost)}`} icon={DollarSign} />
        <MetricCard
          title="Total Return"
          value={`${summary.totalReturn >= 0 ? "+" : ""}$${formatAmount(Math.abs(summary.totalReturn))}`}
          icon={TrendingUp}
          valueClassName={summary.totalReturn >= 0 ? "text-success" : "text-destructive"}
          subtitle={`${summary.totalReturn >= 0 ? "+" : ""}${summary.totalReturnPercent.toFixed(2)}%`}
        />
      </div>

      {/* Account Breakdown */}
      {accountBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Market Value
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Gain/Loss
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Return
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accountBreakdown.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="px-3 py-3 text-sm font-medium text-foreground">
                        {h.account?.name ?? "Unknown"}
                        {h.account?.mask && (
                          <span className="text-xs text-muted-foreground ml-1">(...{h.account.mask})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {h.qty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-muted-foreground">${formatAmount(h.avgCost)}</td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-foreground">
                        ${formatAmount(h.marketValue)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        <span className={h.gainLoss >= 0 ? "text-success font-medium" : "text-destructive font-medium"}>
                          {h.gainLoss >= 0 ? "+" : ""}${formatAmount(Math.abs(h.gainLoss))}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        <span
                          className={
                            h.gainLossPercent >= 0 ? "text-success font-medium" : "text-destructive font-medium"
                          }
                        >
                          {h.gainLossPercent >= 0 ? "+" : ""}
                          {h.gainLossPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/50">
                      <td className="px-3 py-3 text-sm text-foreground whitespace-nowrap">
                        {tx.transactionDatetime
                          ? new Date(tx.transactionDatetime).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <Badge variant="outline" className="capitalize text-xs">
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {tx.quantity_number != null
                          ? tx.quantity_number.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-foreground">
                        {tx.price_number != null ? `$${formatAmount(tx.price_number)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-medium text-foreground">
                        {tx.amount_number != null ? `$${formatAmount(tx.amount_number)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                        {tx.fees_number != null && tx.fees_number > 0 ? `$${formatAmount(tx.fees_number)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-muted-foreground truncate max-w-[150px]">
                        {tx.account?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
