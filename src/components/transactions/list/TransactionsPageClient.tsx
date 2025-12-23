"use client"

import { useState, useRef } from "react"
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList"
import { AddTransactionModal } from "@/components/transactions/modals/AddTransactionModal"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Sheet, Plus, MoreHorizontal, ArrowDownToLine, Copy } from "lucide-react"
import { toast } from "sonner"
import { downloadTransactionsCSV, copyTransactionsForGoogleSheets } from "@/lib/transactions/export"
import { logError } from "@/lib/utils/logger"
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
      logError("Error downloading CSV:", error)
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
      logError("Error copying for Google Sheets:", error)
      toast.error("Failed to copy to clipboard. Please try again.")
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground">
              {transactions.length.toLocaleString()} total transactions
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Export dropdown for desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadCSV} disabled={isDownloading}>
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  {isDownloading ? "Downloading..." : "Download CSV"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyForGoogleSheets} disabled={isCopying}>
                  <Copy className="h-4 w-4 mr-2" />
                  {isCopying ? "Copying..." : "Copy for Google Sheets"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile more menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadCSV} disabled={isDownloading}>
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  {isDownloading ? "Downloading..." : "Download CSV"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyForGoogleSheets} disabled={isCopying}>
                  <Copy className="h-4 w-4 mr-2" />
                  {isCopying ? "Copying..." : "Copy for Sheets"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowAddModal(true)} size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Transaction</span>
            </Button>
          </div>
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
