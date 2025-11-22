"use client"

import { useState, useMemo, useTransition } from "react"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { TagSelector } from "@/components/transactions/filters/TagSelector"
import { confirmTransactions } from "@/app/(app)/review-transactions/actions/confirm-transactions"
import { useRouter } from "next/navigation"
import { ArrowLeftRight } from "lucide-react"

interface ReviewTransactionsClientProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
  tags: TagForClient[]
}

interface TransactionEdit {
  id: string
  categoryId: string | null
  subcategoryId: string | null
  notes: string | null
  newAmount: number | null // null means no change, otherwise the new amount
  tagIds: string[] // Array of tag IDs for this transaction
  isSelected: boolean
}

export function ReviewTransactionsClient({ transactions, categories, tags }: ReviewTransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showFlipAmountDialog, setShowFlipAmountDialog] = useState(false)
  const [flipAmountData, setFlipAmountData] = useState<{ transactionId: string; originalAmount: number } | null>(null)

  // Initialize edits state - all transactions selected by default
  const [edits, setEdits] = useState<Map<string, TransactionEdit>>(() => {
    const initialEdits = new Map<string, TransactionEdit>()
    transactions.forEach((t) => {
      initialEdits.set(t.id, {
        id: t.id,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        notes: t.notes,
        newAmount: null, // null means no change
        tagIds: t.tags.map((tag) => tag.id), // Initialize with current tags
        isSelected: true, // All selected by default
      })
    })
    return initialEdits
  })

  // Get current edit for a transaction
  const getEdit = (transactionId: string): TransactionEdit => {
    return edits.get(transactionId)!
  }

  // Update edit for a transaction
  const updateEdit = (transactionId: string, update: Partial<TransactionEdit>) => {
    setEdits((prev) => {
      const newEdits = new Map(prev)
      const current = newEdits.get(transactionId)!
      newEdits.set(transactionId, { ...current, ...update })
      return newEdits
    })
  }

  // Toggle selection for a transaction
  const toggleSelection = (transactionId: string) => {
    updateEdit(transactionId, { isSelected: !getEdit(transactionId).isSelected })
  }

  // Toggle all selections
  const allSelected = useMemo(() => {
    return Array.from(edits.values()).every((edit) => edit.isSelected)
  }, [edits])

  const toggleAllSelections = () => {
    const newValue = !allSelected
    setEdits((prev) => {
      const newEdits = new Map(prev)
      newEdits.forEach((edit) => {
        edit.isSelected = newValue
      })
      return new Map(newEdits)
    })
  }

  // Get selected count
  const selectedCount = useMemo(() => {
    return Array.from(edits.values()).filter((edit) => edit.isSelected).length
  }, [edits])

  // Handle confirm button click - opens confirmation dialog
  const handleConfirmClick = () => {
    if (selectedCount === 0) {
      return
    }
    setShowConfirmDialog(true)
  }

  // Actual confirm logic - executes after user confirms in dialog
  const handleConfirm = async () => {
    const selectedEdits = Array.from(edits.values())
      .filter((edit) => edit.isSelected)
      .map((edit) => ({
        id: edit.id,
        categoryId: edit.categoryId,
        subcategoryId: edit.subcategoryId,
        notes: edit.notes,
        newAmount: edit.newAmount,
        tagIds: edit.tagIds,
      }))

    if (selectedEdits.length === 0) {
      return
    }

    setShowConfirmDialog(false)

    startTransition(async () => {
      const result = await confirmTransactions(selectedEdits)

      if (result.success) {
        // Redirect to homepage after confirming
        router.push("/")
      } else {
        setErrorMessage(result.error || "An unexpected error occurred")
        setShowErrorDialog(true)
      }
    })
  }

  // Show flip amount warning dialog
  const handleFlipAmountClick = (transactionId: string, originalAmount: number) => {
    setFlipAmountData({ transactionId, originalAmount })
    setShowFlipAmountDialog(true)
  }

  // Toggle amount sign for a transaction (after confirmation)
  const confirmFlipAmount = () => {
    if (!flipAmountData) return

    const edit = getEdit(flipAmountData.transactionId)
    const currentAmount = edit.newAmount !== null ? edit.newAmount : flipAmountData.originalAmount
    updateEdit(flipAmountData.transactionId, { newAmount: currentAmount * -1 })

    setShowFlipAmountDialog(false)
    setFlipAmountData(null)
  }

  // Toggle tag for a transaction
  const toggleTag = (transactionId: string, tagId: string) => {
    const edit = getEdit(transactionId)
    const newTagIds = edit.tagIds.includes(tagId) ? edit.tagIds.filter((id) => id !== tagId) : [...edit.tagIds, tagId]
    updateEdit(transactionId, { tagIds: newTagIds })
  }

  // Check if a transaction has the "for-review" tag
  const hasForReviewTag = (transaction: TransactionForClient) => {
    return transaction.tags.some((tag) => tag.name === "for-review")
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Format date - shorter format to save space
  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const month = date.toLocaleDateString("en-US", { month: "short" })
    const day = date.getDate()
    const year = date.toLocaleDateString("en-US", { year: "2-digit" })
    return `${month} ${day} ${year}`
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Review Transactions</h1>
          <p className="text-muted-foreground mt-2">
            Review and categorize uncategorized transactions or transactions tagged for review
          </p>
        </div>
        <div className="flex items-center justify-center h-64 border border-border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No transactions need review</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Review Transactions</h1>
          <p className="text-muted-foreground mt-2">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} need review
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button onClick={handleConfirmClick} disabled={selectedCount === 0 || isPending} size="lg">
            {isPending ? "Confirming..." : `Confirm ${selectedCount} Transaction${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAllSelections} aria-label="Select all" />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const edit = getEdit(transaction.id)
              const needsCategory = !edit.categoryId
              const displayAmount = edit.newAmount !== null ? edit.newAmount : transaction.amount_number

              return (
                <TableRow key={transaction.id} className={!edit.isSelected ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={edit.isSelected}
                      onCheckedChange={() => toggleSelection(transaction.id)}
                      aria-label={`Select transaction ${transaction.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(transaction.datetime)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-xs">
                      <div className="truncate">{transaction.merchantName || transaction.name}</div>
                      {transaction.merchantName !== transaction.name && (
                        <div className="text-xs text-muted-foreground truncate">{transaction.name}</div>
                      )}
                      <div className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {transaction.account?.name || "Unknown"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <span className={edit.newAmount !== null ? "text-primary" : ""}>
                        {formatCurrency(displayAmount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleFlipAmountClick(transaction.id, transaction.amount_number)}
                        title="Flip amount sign"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <CategorySelect
                        value={edit.categoryId || ""}
                        onChange={(value) => {
                          updateEdit(transaction.id, {
                            categoryId: value || null,
                            subcategoryId: null, // Reset subcategory when category changes
                          })
                        }}
                        categories={categories}
                        placeholder="Select category..."
                        className="w-full px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input"
                      />
                      <SubcategorySelect
                        value={edit.subcategoryId || ""}
                        onChange={(value) => {
                          updateEdit(transaction.id, { subcategoryId: value || null })
                        }}
                        categories={categories}
                        categoryId={edit.categoryId}
                        placeholder="None"
                        className="w-full px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[200px]">
                      <TagSelector
                        tags={tags}
                        selectedTagIds={edit.tagIds}
                        onToggleTag={(tagId) => toggleTag(transaction.id, tagId)}
                        label=""
                        showManageLink={false}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={edit.notes || ""}
                      onChange={(e) => {
                        updateEdit(transaction.id, { notes: e.target.value || null })
                      }}
                      placeholder="Add notes..."
                      className="min-w-[200px] text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {needsCategory && (
                        <Badge variant="destructive" className="text-xs">
                          Uncategorized
                        </Badge>
                      )}
                      {hasForReviewTag(transaction) && (
                        <Badge
                          variant="outline"
                          className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400"
                        >
                          For Review
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transaction Updates</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save changes to {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}? This
              will update categories, subcategories, amounts, tags, and notes, and remove the "for-review" tag from
              confirmed transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Confirming..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error Saving Changes</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogCancel onClick={() => setFlipAmountData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFlipAmount} className="bg-destructive hover:bg-destructive/90">
              Flip Amount Sign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
