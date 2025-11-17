"use client"

import { useState, useRef } from "react"
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList"
import { AddTransactionModal } from "@/components/transactions/modals/AddTransactionModal"
import { Button } from "@/components/ui/button"
import { Download, Sheet } from "lucide-react"
import { toast } from "sonner"
import { downloadTransactionsCSV, copyTransactionsForGoogleSheets } from "@/lib/transactions/export"
import type { TransactionForClient, CategoryForClient, TagForClient, PlaidAccountForClient } from "@/types"
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params"

interface TransactionsPageClientProps {
  transactions: TransactionForClient[]
  categories: CategoryForClient[]
  tags: TagForClient[]
  accounts: PlaidAccountForClient[]
  initialFilters?: TransactionFiltersFromUrl
}

export function TransactionsPageClient({
  transactions,
  categories,
  tags,
  accounts,
  initialFilters,
}: TransactionsPageClientProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  // Use ref instead of state - updates won't cause re-renders
  const filteredTransactionIdsRef = useRef<string[]>([])

  const handleDownloadCSV = async () => {
    const filteredIds = filteredTransactionIdsRef.current

    if (filteredIds.length === 0) {
      toast.error("No transactions to export")
      return
    }

    setIsDownloading(true)
    try {
      await downloadTransactionsCSV(filteredIds)
      toast.success(`Downloaded ${filteredIds.length} transaction(s) to CSV`)
    } catch (error) {
      console.error("Error downloading CSV:", error)
      toast.error("Failed to download CSV. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopyForGoogleSheets = async () => {
    const filteredIds = filteredTransactionIdsRef.current

    if (filteredIds.length === 0) {
      toast.error("No transactions to copy")
      return
    }

    setIsCopying(true)
    try {
      await copyTransactionsForGoogleSheets(filteredIds)
      toast.success(
        `Copied ${filteredIds.length} transaction(s) to clipboard! Paste into Google Sheets (Ctrl+V or Cmd+V)`,
      )
    } catch (error) {
      console.error("Error copying for Google Sheets:", error)
      toast.error("Failed to copy to clipboard. Please try again.")
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
          <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleCopyForGoogleSheets} disabled={isCopying}>
            <Sheet className="h-4 w-4 mr-2" />
            {isCopying ? "Copying..." : "Copy to Clipboard"}
          </Button>
          <Button variant="outline" onClick={handleDownloadCSV} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download CSV"}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Add Transaction</Button>
        </div>
      </div>

      <SearchableTransactionList
        transactions={transactions}
        categories={categories}
        tags={tags}
        accounts={accounts}
        initialFilters={initialFilters}
        onFilteredTransactionsChange={(ids) => {
          filteredTransactionIdsRef.current = ids
        }}
      />

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          categories={categories}
          tags={tags}
          accounts={accounts}
        />
      )}
    </>
  )
}
