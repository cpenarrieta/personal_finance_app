import { Sparkles, Loader2, Split, Pencil, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TransactionForClient } from "@/types"

interface TransactionActionsProps {
  transaction: TransactionForClient
  isAILoading: boolean
  onAICategorize: () => void
  onSplit: () => void
  onSmartSplit?: () => void
  isSmartSplitLoading?: boolean
  onEdit: () => void
  onDelete: () => void
}

export function TransactionActions({
  transaction,
  isAILoading,
  onAICategorize,
  onSplit,
  onSmartSplit,
  isSmartSplitLoading = false,
  onEdit,
  onDelete,
}: TransactionActionsProps) {
  const hasFiles = transaction.files && transaction.files.length > 0
  const canSplit = !transaction.isSplit && !transaction.parentTransactionId

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={onAICategorize}
        variant="outline"
        className="border-primary text-primary hover:bg-primary/10"
        disabled={isAILoading}
      >
        {isAILoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI Categorizing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI-Categorize
          </>
        )}
      </Button>
      {hasFiles && onSmartSplit && (
        <Button
          onClick={onSmartSplit}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
          disabled={isSmartSplitLoading}
        >
          {isSmartSplitLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              AI Analyze Receipt
            </>
          )}
        </Button>
      )}
      {canSplit && (
        <Button onClick={onSplit} variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Split className="mr-2 h-4 w-4" />
          Split Transaction
        </Button>
      )}
      <Button onClick={onEdit} className="bg-primary hover:bg-primary/90">
        <Pencil className="mr-2 h-4 w-4" />
        Edit Transaction
      </Button>
      <Button onClick={onDelete} variant="destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </div>
  )
}
