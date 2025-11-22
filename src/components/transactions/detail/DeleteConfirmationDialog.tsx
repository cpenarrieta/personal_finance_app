import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatAmount } from "@/lib/utils"
import { formatTransactionDate } from "@/lib/utils/transaction-date"
import type { TransactionForClient } from "@/types"

interface DeleteConfirmationDialogProps {
  transaction: TransactionForClient
  isOpen: boolean
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteConfirmationDialog({
  transaction,
  isOpen,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const amount = transaction.amount_number
  const isExpense = amount < 0
  const absoluteAmount = Math.abs(amount)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
            {transaction.childTransactions && transaction.childTransactions.length > 0 && (
              <span className="block mt-2 font-medium text-destructive">
                Warning: This will also delete all {transaction.childTransactions.length} split transactions.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="p-3 bg-muted rounded-lg border border-border">
            <p className="font-medium text-foreground">{transaction.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatTransactionDate(transaction.datetime, "medium")} •{" "}
              <span className={isExpense ? "text-destructive" : "text-success"}>
                {isExpense ? "-" : "+"}${formatAmount(absoluteAmount)}
              </span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
