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
import type { AICategorizeResponse } from "@/app/(app)/transactions/[id]/actions"

interface AICategorizationDialogProps {
  transaction: TransactionForClient
  suggestion: AICategorizeResponse | null
  isOpen: boolean
  isApplying: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
  onDeny: () => void
}

export function AICategorizationDialog({
  transaction,
  suggestion,
  isOpen,
  isApplying,
  onOpenChange,
  onApply,
  onDeny,
}: AICategorizationDialogProps) {
  const amount = transaction.amount_number
  const isExpense = amount < 0
  const absoluteAmount = Math.abs(amount)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Categorization Suggestion</DialogTitle>
          <DialogDescription>
            Review the AI-suggested category for this transaction. You can accept or reject the suggestion.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Transaction Info */}
          <div className="p-3 bg-muted rounded-lg border border-border">
            <p className="font-medium text-foreground">{transaction.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatTransactionDate(transaction.datetime, "medium")} •{" "}
              <span className={isExpense ? "text-destructive" : "text-success"}>
                {isExpense ? "-" : "+"}${formatAmount(absoluteAmount)}
              </span>
            </p>
          </div>

          {/* AI Suggestion */}
          {suggestion && (
            <div className="space-y-3">
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">Suggested Category</h4>
                  <span className="text-sm text-primary font-medium">{suggestion.confidence}% confidence</span>
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-medium">
                    {suggestion.categoryName}
                    {suggestion.subcategoryName && (
                      <span className="text-muted-foreground"> → {suggestion.subcategoryName}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">AI Reasoning</h5>
                <p className="text-sm text-foreground">{suggestion.reasoning}</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDeny} disabled={isApplying}>
            Deny
          </Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? "Applying..." : "Confirm & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
