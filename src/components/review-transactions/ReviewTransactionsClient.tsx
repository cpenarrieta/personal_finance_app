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
import { confirmTransactions } from "@/app/(app)/review-transactions/actions/confirm-transactions"
import { useRouter } from "next/navigation"

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
  isSelected: boolean
}

export function ReviewTransactionsClient({ transactions, categories }: ReviewTransactionsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Initialize edits state - all transactions selected by default
  const [edits, setEdits] = useState<Map<string, TransactionEdit>>(() => {
    const initialEdits = new Map<string, TransactionEdit>()
    transactions.forEach((t) => {
      initialEdits.set(t.id, {
        id: t.id,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId,
        notes: t.notes,
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
      }))

    if (selectedEdits.length === 0) {
      return
    }

    setShowConfirmDialog(false)

    startTransition(async () => {
      const result = await confirmTransactions(selectedEdits)

      if (result.success) {
        // Refresh the page to show updated data
        router.refresh()
      } else {
        setErrorMessage(result.error || "An unexpected error occurred")
        setShowErrorDialog(true)
      }
    })
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
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    })
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
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const edit = getEdit(transaction.id)
              const needsCategory = !edit.categoryId

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
                    {formatDate(transaction.date_string)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-xs">
                      <div className="truncate">{transaction.merchantName || transaction.name}</div>
                      {transaction.merchantName !== transaction.name && (
                        <div className="text-xs text-muted-foreground truncate">{transaction.name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.account?.name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(transaction.amount_number)}
                  </TableCell>
                  <TableCell>
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
                      className="min-w-[180px] px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <SubcategorySelect
                      value={edit.subcategoryId || ""}
                      onChange={(value) => {
                        updateEdit(transaction.id, { subcategoryId: value || null })
                      }}
                      categories={categories}
                      categoryId={edit.categoryId}
                      placeholder="None"
                      className="min-w-[180px] px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
                    />
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
              will update categories, subcategories, and notes, and remove the "for-review" tag from confirmed
              transactions.
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
    </div>
  )
}
