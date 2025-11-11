import { useState } from "react"
import { toast } from "sonner"
import type { TransactionForClient, CategoryForClient } from "@/types"

export function useBulkTransactionOperations() {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showBulkUpdate, setShowBulkUpdate] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState("")
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState("")
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  // Toggle transaction selection
  const toggleTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTransactions(newSelected)
  }

  // Select all transactions
  const selectAll = (transactions: TransactionForClient[]) => {
    setSelectedTransactions(new Set(transactions.map((t) => t.id)))
    toast.success(`Selected ${transactions.length} transactions`)
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedTransactions(new Set())
  }

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedTransactions.size === 0 || !bulkCategoryId) {
      return
    }

    setIsBulkUpdating(true)
    const toastId = toast.loading(`Updating ${selectedTransactions.size} transactions...`)

    try {
      const response = await fetch("/api/transactions/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions),
          categoryId: bulkCategoryId,
          subcategoryId: bulkSubcategoryId && bulkSubcategoryId !== "NONE" ? bulkSubcategoryId : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to bulk update transactions")
      }

      toast.success(`Updated ${selectedTransactions.size} transactions!`, { id: toastId })

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error("Error bulk updating transactions:", error)
      toast.error("Failed to update transactions", { id: toastId })
    } finally {
      setIsBulkUpdating(false)
    }
  }

  // Get subcategories for selected bulk category
  const getAvailableSubcategories = (categories: CategoryForClient[]) => {
    const selectedCategory = categories.find((c) => c.id === bulkCategoryId)
    return selectedCategory?.subcategories || []
  }

  return {
    selectedTransactions,
    showBulkUpdate,
    bulkCategoryId,
    bulkSubcategoryId,
    isBulkUpdating,
    setSelectedTransactions,
    setShowBulkUpdate,
    setBulkCategoryId,
    setBulkSubcategoryId,
    toggleTransaction,
    selectAll,
    deselectAll,
    handleBulkUpdate,
    getAvailableSubcategories,
  }
}
