"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { TransactionItem } from "@/components/transactions/list/TransactionItem"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import type { TransactionForClient, CategoryForClient } from "@/types"
import { toast } from "sonner"

function MoveTransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse bg-muted h-48 rounded-lg" />
      <div className="animate-pulse bg-muted h-32 rounded-lg" />
    </div>
  )
}

export function MoveTransactionsConvex() {
  const categoriesData = useQuery(api.categories.getAll)
  const bulkUpdate = useMutation(api.transactions.bulkUpdate)

  // Step 1: Select "from" category/subcategory
  const [fromCategoryId, setFromCategoryId] = useState<string>("")
  const [fromSubcategoryId, setFromSubcategoryId] = useState<string>("")

  // Step 2: Select "to" category/subcategory
  const [toCategoryId, setToCategoryId] = useState<string>("")
  const [toSubcategoryId, setToSubcategoryId] = useState<string>("")

  // Step 3: Show transactions and allow selection
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set())
  const [showTransactions, setShowTransactions] = useState(false)

  // Step 4: Confirmation and execution
  const [isMoving, setIsMoving] = useState(false)
  const [moveComplete, setMoveComplete] = useState(false)
  const [movedCount, setMovedCount] = useState(0)

  // Fetch transactions when "from" selection is made - reactive query
  const transactionsData = useQuery(
    api.transactions.getByCategory,
    showTransactions && fromCategoryId
      ? {
          categoryId: fromCategoryId as Id<"categories">,
          subcategoryId: fromSubcategoryId
            ? fromSubcategoryId === "null"
              ? null
              : (fromSubcategoryId as Id<"subcategories">)
            : undefined,
        }
      : "skip",
  )

  if (categoriesData === undefined) {
    return <MoveTransactionsSkeleton />
  }

  const categories = categoriesData as CategoryForClient[]
  const transactions = (transactionsData as TransactionForClient[] | undefined) ?? []

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTransactionIds.size === transactions.length) {
      setSelectedTransactionIds(new Set())
    } else {
      setSelectedTransactionIds(new Set(transactions.map((t) => t.id)))
    }
  }

  // Handle individual transaction selection
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedTransactionIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTransactionIds(newSelected)
  }

  // Handle move transactions
  const handleMoveTransactions = async () => {
    if (selectedTransactionIds.size === 0) {
      toast.error("Please select at least one transaction to move")
      return
    }

    if (!toCategoryId) {
      toast.error("Please select a destination category")
      return
    }

    const confirmMessage = `Are you sure you want to move ${selectedTransactionIds.size} transaction(s) to the selected category?`
    if (!confirm(confirmMessage)) {
      return
    }

    setIsMoving(true)
    try {
      await bulkUpdate({
        transactionIds: Array.from(selectedTransactionIds) as Id<"transactions">[],
        categoryId: toCategoryId as Id<"categories">,
        subcategoryId: toSubcategoryId ? (toSubcategoryId as Id<"subcategories">) : null,
      })

      const count = selectedTransactionIds.size
      setMovedCount(count)
      setMoveComplete(true)
      setSelectedTransactionIds(new Set())
      toast.success(`Moved ${count} transaction(s) successfully!`)
    } catch (error) {
      toast.error("Failed to move transactions")
    } finally {
      setIsMoving(false)
    }
  }

  // Reset the form
  const handleReset = () => {
    setFromCategoryId("")
    setFromSubcategoryId("")
    setToCategoryId("")
    setToSubcategoryId("")
    setSelectedTransactionIds(new Set())
    setShowTransactions(false)
    setMoveComplete(false)
    setMovedCount(0)
  }

  const fromCategory = categories.find((c) => c.id === fromCategoryId)
  const toCategory = categories.find((c) => c.id === toCategoryId)

  return (
    <div>
      {moveComplete && (
        <div className="mb-4 p-4 bg-success/10 text-success-foreground rounded">
          Successfully moved {movedCount} transaction(s)!
        </div>
      )}

      {/* Step 1: Select "From" Category/Subcategory */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Step 1: Select Source Category</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">From Category</label>
            <CategorySelect
              value={fromCategoryId}
              onChange={(value) => {
                setFromCategoryId(value)
                setFromSubcategoryId("")
                setShowTransactions(false)
                setSelectedTransactionIds(new Set())
              }}
              categories={categories}
              placeholder="Select a category..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {fromCategoryId && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                From Subcategory (Optional)
              </label>
              <SubcategorySelect
                value={fromSubcategoryId}
                onChange={(value) => {
                  setFromSubcategoryId(value)
                  setShowTransactions(false)
                  setSelectedTransactionIds(new Set())
                }}
                categories={categories}
                categoryId={fromCategoryId}
                showAllOption
                showNullOption
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {fromCategoryId && (
            <button
              onClick={() => setShowTransactions(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Next: View Transactions
            </button>
          )}
        </div>
      </div>

      {/* Step 2 & 3: Select "To" Category and Show Transactions */}
      {showTransactions && (
        <>
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Select Destination Category</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">To Category</label>
                <CategorySelect
                  value={toCategoryId}
                  onChange={(value) => {
                    setToCategoryId(value)
                    setToSubcategoryId("")
                  }}
                  categories={categories}
                  placeholder="Select a category..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {toCategoryId && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    To Subcategory (Optional)
                  </label>
                  <SubcategorySelect
                    value={toSubcategoryId}
                    onChange={setToSubcategoryId}
                    categories={categories}
                    categoryId={toCategoryId}
                    placeholder="No subcategory"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Step 3: Select Transactions (
                {transactionsData === undefined ? "Loading..." : `${transactions.length} found`})
              </h2>
              {transactions.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
                >
                  {selectedTransactionIds.size === transactions.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {transactionsData === undefined ? (
              <div className="animate-pulse bg-muted h-32 rounded-lg" />
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground">No transactions found for this category/subcategory.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Selected: {selectedTransactionIds.size} of {transactions.length}
                </p>
                <ul className="border rounded-lg divide-y">
                  {transactions.map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      showBulkUpdate={true}
                      isSelected={selectedTransactionIds.has(transaction.id)}
                      onToggleSelect={handleToggleSelect}
                      showAccount={true}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Step 4: Confirm and Move */}
          {transactions.length > 0 && selectedTransactionIds.size > 0 && toCategoryId && (
            <div className="border rounded-lg p-6 mb-6 bg-primary/10">
              <h2 className="text-xl font-semibold mb-4">Step 4: Confirm Move</h2>
              <p className="mb-4">
                You are about to move <strong>{selectedTransactionIds.size}</strong> transaction(s) from{" "}
                <strong>{fromCategory?.name}</strong>
                {fromSubcategoryId && fromSubcategoryId !== "null" && (
                  <> ({fromCategory?.subcategories?.find((s) => s.id === fromSubcategoryId)?.name})</>
                )}{" "}
                to <strong>{toCategory?.name}</strong>
                {toSubcategoryId && <> ({toCategory?.subcategories?.find((s) => s.id === toSubcategoryId)?.name})</>}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleMoveTransactions}
                  disabled={isMoving}
                  className="px-6 py-3 bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:bg-muted font-semibold"
                >
                  {isMoving ? "Moving..." : "Confirm and Move Transactions"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isMoving}
                  className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
