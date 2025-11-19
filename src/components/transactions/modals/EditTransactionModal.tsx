"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatAmount } from "@/lib/utils"
import { formatTransactionDate } from "@/lib/utils/transaction-date"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import { Button } from "@/components/ui/button"
import { TagSelector } from "@/components/transactions/filters/TagSelector"
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
import { ArrowLeftRight } from "lucide-react"

interface EditTransactionModalProps {
  transaction: TransactionForClient
  onClose: () => void
  categories: CategoryForClient[]
  tags: TagForClient[]
}

export function EditTransactionModal({ transaction, onClose, categories, tags }: EditTransactionModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFlipAmountDialog, setShowFlipAmountDialog] = useState(false)

  // Form state
  const [name, setName] = useState(transaction.name)
  const [newAmount, setNewAmount] = useState<number | null>(null) // null means no change
  const [categoryId, setCategoryId] = useState(transaction.categoryId || "")
  const [subcategoryId, setSubcategoryId] = useState(transaction.subcategoryId || "")
  const [notes, setNotes] = useState(transaction.notes || "")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    transaction.tags?.map((tag: TagForClient) => tag.id) || [],
  )

  const displayAmount = newAmount !== null ? newAmount : transaction.amount_number

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const confirmFlipAmount = () => {
    // Explicitly calculate current amount to avoid closure issues
    const currentAmount = newAmount !== null ? newAmount : transaction.amount_number
    setNewAmount(currentAmount * -1)
    setShowFlipAmountDialog(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const toastId = toast.loading("Updating transaction...")

    try {
      const updatePayload: Record<string, unknown> = {
        name,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        notes: notes || null,
        tagIds: selectedTagIds,
      }

      // Only include amount if it was changed
      // Note: Database stores amount with opposite sign of what user sees
      // (amount_number = amount * -1), so we need to flip it before sending
      if (newAmount !== null) {
        updatePayload.amount = newAmount * -1
      }

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        throw new Error("Failed to update transaction")
      }

      toast.success("Transaction updated!", { id: toastId })

      // Refresh the page to show updated data
      router.refresh()
      onClose()
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Name */}
          <div className="space-y-2">
            <Label htmlFor="transaction-name">Transaction Name</Label>
            <Input
              id="transaction-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Transaction name"
            />
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                id="category"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value)
                  setSubcategoryId("") // Reset subcategory when category changes
                }}
                categories={categories}
                placeholder="None"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <SubcategorySelect
                id="subcategory"
                value={subcategoryId}
                onChange={setSubcategoryId}
                categories={categories}
                categoryId={categoryId}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any notes about this transaction..."
              autoFocus
            />
          </div>

          {/* Tags */}
          <TagSelector tags={tags} selectedTagIds={selectedTagIds} onToggleTag={toggleTag} />

          {/* Transaction Details (Read-only) */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-2">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Transaction ID:</div>
              <div className="font-medium font-mono text-xs">{transaction.id}</div>
              <div className="text-muted-foreground">Amount:</div>
              <div className="font-medium flex items-center gap-2">
                <span className={newAmount !== null ? "text-primary" : ""}>
                  {displayAmount < 0 ? "-" : "+"}${formatAmount(displayAmount)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowFlipAmountDialog(true)}
                  title="Flip amount sign"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-muted-foreground">Account:</div>
              <div className="font-medium">{transaction.account?.name}</div>
              <div className="text-muted-foreground">Transaction Date:</div>
              <div className="font-medium">{formatTransactionDate(transaction.datetime, "medium")}</div>
              <div className="text-muted-foreground">Creation Date:</div>
              <div className="font-medium">{format(new Date(transaction.created_at_string), "MMM d yyyy, h:mm a")}</div>
              {transaction.merchantName && (
                <>
                  <div className="text-muted-foreground">Merchant:</div>
                  <div className="font-medium">{transaction.merchantName}</div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Flip Amount Warning Dialog */}
      <AlertDialog open={showFlipAmountDialog} onOpenChange={setShowFlipAmountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flip Transaction Amount Sign?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="font-semibold text-destructive">⚠️ Warning: This is a very rare operation</div>
                <div>
                  Flipping the amount sign should <strong>only</strong> be used when you are 100% confident that Plaid
                  API made a mistake with the transaction amount sign.
                </div>
                <div className="text-sm">
                  In most cases, the sign is correct. Proceed only if you're absolutely certain this is incorrect.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFlipAmount} className="bg-destructive hover:bg-destructive/90">
              Flip Amount Sign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
