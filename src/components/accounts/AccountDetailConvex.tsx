"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { format } from "date-fns"
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList"
import { InvestmentTransactionList } from "@/components/investments/transactions/InvestmentTransactionList"
import { HoldingList } from "@/components/investments/holdings/HoldingList"
import { AccountDetailSkeleton } from "./AccountDetailSkeleton"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  HoldingForClient,
  InvestmentTransactionForClient,
} from "@/types"

interface AccountDetailConvexProps {
  id: string
}

/**
 * Convex wrapper for Account Detail page
 * Fetches account, transactions/holdings, categories, and tags
 */
export function AccountDetailConvex({ id }: AccountDetailConvexProps) {
  const accountId = id as Id<"accounts">

  const account = useQuery(api.accounts.getById, { id: accountId })
  const categories = useQuery(api.categories.getAll)
  const tags = useQuery(api.tags.getAll)

  // Determine if investment account for conditional queries
  const isInvestmentAccount = account?.type === "investment" || account?.subtype?.includes("brokerage")

  // Fetch data based on account type
  const transactions = useQuery(
    api.transactions.getForAccount,
    !isInvestmentAccount && account ? { accountId } : "skip",
  )
  const holdings = useQuery(
    api.investments.getHoldingsForAccount,
    isInvestmentAccount && account ? { accountId } : "skip",
  )
  const investmentTransactions = useQuery(
    api.investments.getInvestmentTransactionsForAccount,
    isInvestmentAccount && account ? { accountId } : "skip",
  )

  // Loading state
  if (account === undefined || categories === undefined || tags === undefined) {
    return <AccountDetailSkeleton />
  }

  // Not found
  if (account === null) {
    return (
      <ErrorFallback title="Account not found" description="This account may have been deleted or doesn't exist." />
    )
  }

  // Still loading transactions/holdings
  if (isInvestmentAccount && (holdings === undefined || investmentTransactions === undefined)) {
    return <AccountDetailSkeleton />
  }
  if (!isInvestmentAccount && transactions === undefined) {
    return <AccountDetailSkeleton />
  }

  // Transform data
  const transformedCategories = categories as CategoryForClient[]
  const transformedTags = tags as TagForClient[]

  let content
  if (isInvestmentAccount) {
    content = (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Holdings</h3>
          <HoldingList holdings={(holdings || []) as HoldingForClient[]} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-3">Investment Transactions</h3>
          <InvestmentTransactionList
            transactions={(investmentTransactions || []) as InvestmentTransactionForClient[]}
          />
        </div>
      </div>
    )
  } else {
    const transformedTransactions: TransactionForClient[] = (transactions || []).map((t) => ({
      ...t,
      amount_number: t.amount_number ?? 0,
    })) as TransactionForClient[]

    content = (
      <div>
        <h3 className="text-lg font-semibold mb-3">Transactions</h3>
        <SearchableTransactionList
          transactions={transformedTransactions}
          showAccount={false}
          categories={transformedCategories}
          tags={transformedTags}
        />
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 p-6 border rounded-lg bg-card shadow-md">
        <h2 className="text-2xl font-semibold mb-4">
          {account.name} {account.mask ? `• ${account.mask}` : ""}
        </h2>
        <div className="text-sm text-muted-foreground mb-4">
          {account.type}
          {account.subtype ? ` / ${account.subtype}` : ""} · {account.currency}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {account.current_balance_number != null && (
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
              <div className="text-sm text-primary mb-1">Current Balance</div>
              <div className="text-2xl font-bold text-foreground">
                $
                {account.current_balance_number.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          )}

          {account.available_balance_number != null && (
            <div className="bg-success/10 rounded-lg p-4 border border-success/30">
              <div className="text-sm text-success mb-1">Available Balance</div>
              <div className="text-2xl font-bold text-foreground">
                $
                {account.available_balance_number.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          )}

          {account.credit_limit_number != null && (
            <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/30">
              <div className="text-sm text-secondary mb-1">Credit Limit</div>
              <div className="text-2xl font-bold text-foreground">
                $
                {account.credit_limit_number.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          )}
        </div>

        {account.balance_updated_at_string && (
          <div className="text-xs text-muted-foreground mt-4">
            Balance last updated: {format(new Date(account.balance_updated_at_string), "MMM d yyyy h:mm a")}
          </div>
        )}
      </div>

      {content}
    </>
  )
}
