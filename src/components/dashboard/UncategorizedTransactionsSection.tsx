import Link from "next/link"
import { format } from "date-fns"
import { formatAmount } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// Type matching serializable query results (using generated columns)
type SerializableUncategorizedTransaction = {
  id: string
  name: string
  merchantName: string | null
  amount_number: number | null
  date_string: string | null
  account: {
    id: string
    name: string
  }
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string
    }
  }>
}

interface UncategorizedTransactionsSectionProps {
  count: number
  transactions: SerializableUncategorizedTransaction[]
  displayLimit?: number
}

export function UncategorizedTransactionsSection({
  count,
  transactions,
  displayLimit = 10,
}: UncategorizedTransactionsSectionProps) {
  if (count === 0) {
    return null
  }

  const displayedTransactions = transactions.slice(0, displayLimit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Uncategorized Transactions</h2>
          <p className="text-muted-foreground">
            {count} transaction{count !== 1 ? "s" : ""} need categorization
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions?showIncome=true&showExpenses=true&uncategorized=true">Categorize All</Link>
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTransactions.map((transaction) => {
              const amount = transaction.amount_number || 0
              return (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap">
                    {transaction.date_string ? format(new Date(transaction.date_string), "MMM d, yyyy") : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/transactions/${transaction.id}`} className="block hover:underline">
                      <div className="font-medium">{transaction.name}</div>
                      {transaction.merchantName && (
                        <div className="text-sm text-muted-foreground">{transaction.merchantName}</div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>{transaction.account.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={amount < 0 ? "text-destructive" : "text-success"}>
                      {amount < 0 ? "-" : "+"}${formatAmount(amount)}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {count > displayLimit && (
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/transactions?showIncome=true&showExpenses=true&uncategorized=true">
              View All {count} Uncategorized Transactions
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
