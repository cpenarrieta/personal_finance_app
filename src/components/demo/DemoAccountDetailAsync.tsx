import { notFound } from "next/navigation"
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList"
import { InvestmentTransactionList } from "@/components/investments/transactions/InvestmentTransactionList"
import { HoldingList } from "@/components/investments/holdings/HoldingList"
import { format } from "date-fns"
import { ErrorFallback } from "@/components/shared/ErrorFallback"
import { logError } from "@/lib/utils/logger"
import {
  getAccountById,
  getTransactionsForAccount,
  getHoldingsForAccount,
  getInvestmentTransactionsForAccount,
  getAllCategories,
  getAllTags,
} from "@/lib/demo/queries"
import type { TransactionForClient } from "@/types"

export async function DemoAccountDetailAsync({ id }: { id: string }) {
  try {
    const account = await getAccountById(id) as any

    if (!account) {
      notFound()
    }

    const isInvestmentAccount = account.type === "investment" || account.subtype?.includes("brokerage")

    const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()])

    let content

    if (isInvestmentAccount) {
      const [investmentTransactions, holdings] = await Promise.all([
        getInvestmentTransactionsForAccount(account.id),
        getHoldingsForAccount(account.id),
      ])

      content = (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Holdings</h3>
            <HoldingList holdings={holdings as any} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Investment Transactions</h3>
            <InvestmentTransactionList transactions={investmentTransactions as any} />
          </div>
        </div>
      )
    } else {
      const txs = await getTransactionsForAccount(account.id) as any[]
      const transactions = txs.map((t) => ({
        ...t,
        amount_number: t.amount_number ?? 0,
        tags: t.tags.map(
          (tag: any) => ("tag" in tag ? tag.tag : tag),
        ),
      })) as TransactionForClient[]

      content = (
        <div>
          <h3 className="text-lg font-semibold mb-3">Transactions</h3>
          <SearchableTransactionList
            transactions={transactions}
            showAccount={false}
            categories={categories as any}
            tags={tags as any}
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
  } catch (error) {
    logError("Failed to load demo account details:", error)
    return (
      <ErrorFallback error={error as Error} title="Failed to load account" description="Unable to fetch demo account data" />
    )
  }
}
