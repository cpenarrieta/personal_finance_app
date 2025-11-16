import Link from "next/link"
import { format } from "date-fns"
import { formatAmount } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Type matching serializable query results (using generated columns)
type SerializableTransaction = {
  id: string
  name: string
  merchantName: string | null
  amount_number: number | null
  date_string: string | null
  account: {
    id: string
    name: string
  }
  category: {
    id: string
    name: string
  } | null
  subcategory: {
    id: string
    name: string
  } | null
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string
    }
  }>
}

interface TransactionTableProps {
  transactions: SerializableTransaction[]
  showCategory?: boolean
}

export function TransactionTable({ transactions, showCategory = true }: TransactionTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="text-right w-[110px]">Amount</TableHead>
            <TableHead>Description</TableHead>
            {showCategory && <TableHead className="hidden md:table-cell">Category</TableHead>}
            <TableHead className="hidden md:table-cell">Account</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const amount = transaction.amount_number || 0
            return (
              <TableRow key={transaction.id} className="hover:bg-muted/50">
                <TableCell className="whitespace-nowrap w-[100px]">
                  {transaction.date_string ? format(new Date(transaction.date_string), "MMM d, yyyy") : "N/A"}
                </TableCell>
                <TableCell className="text-right font-medium w-[110px]">
                  <span className={amount >= 0 ? "text-success" : ""}>
                    {amount < 0 ? "-" : "+"}${formatAmount(amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <Link href={`/transactions/${transaction.id}`} className="block hover:underline">
                    <div className="font-medium">{transaction.name}</div>
                    {transaction.merchantName && (
                      <div className="text-sm text-muted-foreground">{transaction.merchantName}</div>
                    )}
                    {transaction.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {transaction.tags.map((tt) => (
                          <Badge
                            key={tt.tag.id}
                            variant="secondary"
                            style={{ backgroundColor: tt.tag.color }}
                            className="text-xs text-white"
                          >
                            {tt.tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                </TableCell>
                {showCategory && (
                  <TableCell className="hidden md:table-cell">
                    {transaction.category ? (
                      <div>
                        <div className="font-medium">{transaction.category.name}</div>
                        {transaction.subcategory && (
                          <div className="text-sm text-muted-foreground">{transaction.subcategory.name}</div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Uncategorized</Badge>
                    )}
                  </TableCell>
                )}
                <TableCell className="hidden md:table-cell">{transaction.account.name}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
