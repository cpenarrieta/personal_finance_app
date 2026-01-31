"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles, Loader2, Split, Trash2, Wand2, MoreHorizontal, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { TransactionForClient } from "@/types"

interface TransactionActionsProps {
  transaction: TransactionForClient
  isAILoading: boolean
  onAICategorize: () => void
  onSplit: () => void
  onSmartSplit?: () => void
  isSmartSplitLoading?: boolean
  onDelete: () => void
}

export function TransactionActions({
  transaction,
  isAILoading,
  onAICategorize,
  onSplit,
  onSmartSplit,
  isSmartSplitLoading = false,
  onDelete,
}: TransactionActionsProps) {
  const router = useRouter()
  const [showFlipDialog, setShowFlipDialog] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)

  const hasFiles = transaction.files && transaction.files.length > 0
  const canSplit = !transaction.isSplit && !transaction.parentTransactionId

  const handleFlipAmount = async () => {
    setIsFlipping(true)
    const toastId = toast.loading("Flipping amount sign...")

    try {
      const newAmount = transaction.amount_number * -1

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount }),
      })

      if (!response.ok) {
        throw new Error("Failed to flip amount")
      }

      toast.success("Amount sign flipped!", { id: toastId })
      setShowFlipDialog(false)
      router.refresh()
    } catch {
      toast.error("Failed to flip amount", { id: toastId })
    } finally {
      setIsFlipping(false)
    }
  }

  return (
    <>
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
        <Button onClick={onDelete} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowFlipDialog(true)}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Flip Amount Sign
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Flip Amount Confirmation Dialog */}
      <AlertDialog open={showFlipDialog} onOpenChange={setShowFlipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flip Transaction Amount Sign?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="font-semibold text-destructive">Warning: This is a very rare operation</div>
                <div>
                  Flipping the amount sign should <strong>only</strong> be used when you are 100% confident that Plaid
                  API made a mistake with the transaction amount sign.
                </div>
                <div className="text-sm">
                  In most cases, the sign is correct. Proceed only if you&apos;re absolutely certain this is incorrect.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFlipping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFlipAmount}
              disabled={isFlipping}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isFlipping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Flipping...
                </>
              ) : (
                "Flip Amount Sign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
