"use client"

import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useIsDemo } from "@/components/demo/DemoContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"

interface Transaction {
  id: string
  type: "contribution" | "withdrawal" | "grant"
  amount: number
  date: string
  taxYear: number
  notes: string | null
}

const TX_TYPE_VARIANT = {
  contribution: "soft" as const,
  withdrawal: "soft-destructive" as const,
  grant: "soft-success" as const,
}

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit: (tx: Transaction) => void
}

export function TransactionTable({ transactions, onEdit }: TransactionTableProps) {
  const isDemo = useIsDemo()
  const deleteTransaction = useMutation(api.registeredAccounts.deleteTransaction)

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction({ id: id as Id<"registeredTransactions"> })
      toast.success("Transaction deleted")
    } catch {
      toast.error("Failed to delete transaction")
    }
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No transactions yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Tax Year</TableHead>
          <TableHead>Notes</TableHead>
          {!isDemo && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>{tx.date}</TableCell>
            <TableCell>
              <Badge variant={TX_TYPE_VARIANT[tx.type]} className="capitalize">
                {tx.type}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
            <TableCell>{tx.taxYear}</TableCell>
            <TableCell className="max-w-32 truncate text-muted-foreground text-sm">{tx.notes || "—"}</TableCell>
            {!isDemo && (
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tx)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this {tx.type} of {formatCurrency(tx.amount)}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(tx.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
