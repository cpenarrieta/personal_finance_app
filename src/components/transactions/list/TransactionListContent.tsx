"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionItem } from "@/components/transactions/list/TransactionItem"
import { TransactionChartsView } from "@/components/transactions/analytics/TransactionChartsView"
import { TransactionActionBar } from "@/components/transactions/list/TransactionActionBar"
import type { TransactionForClient, CategoryForClient } from "@/types"

interface TransactionListContentProps {
  filteredTransactions: TransactionForClient[]
  totalTransactions: number
  categories: CategoryForClient[]
  showAccount: boolean
  searchQuery?: string
  bulk: {
    showBulkUpdate: boolean
    setShowBulkUpdate: (show: boolean) => void
    bulkCategoryId: string
    bulkSubcategoryId: string
    setBulkCategoryId: (id: string) => void
    setBulkSubcategoryId: (id: string) => void
    selectedTransactions: Set<string>
    isBulkUpdating: boolean
    selectAll: (transactions: TransactionForClient[]) => void
    deselectAll: () => void
    handleBulkUpdate: () => Promise<void>
    toggleTransaction: (id: string) => void
    getAvailableSubcategories: (categories: CategoryForClient[]) => Array<{ id: string; name: string }>
  }
  onEditTransaction: (transaction: TransactionForClient) => void
}

/**
 * Transaction list content with table/charts tabs
 * Includes bulk operations toolbar and transaction list rendering
 */
export function TransactionListContent({
  filteredTransactions,
  totalTransactions,
  categories,
  showAccount,
  searchQuery,
  bulk,
  onEditTransaction,
}: TransactionListContentProps) {
  const availableBulkSubcategories = bulk.getAvailableSubcategories(categories)

  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="table">Table</TabsTrigger>
        <TabsTrigger value="charts">Charts</TabsTrigger>
      </TabsList>

      <TabsContent value="table" className="space-y-4">
        <TransactionActionBar
          filteredTransactions={filteredTransactions}
          totalTransactions={totalTransactions}
          categories={categories}
          showBulkUpdate={bulk.showBulkUpdate}
          onToggleBulkUpdate={() => bulk.setShowBulkUpdate(!bulk.showBulkUpdate)}
          bulkCategoryId={bulk.bulkCategoryId}
          bulkSubcategoryId={bulk.bulkSubcategoryId}
          setBulkCategoryId={bulk.setBulkCategoryId}
          setBulkSubcategoryId={bulk.setBulkSubcategoryId}
          selectedTransactions={bulk.selectedTransactions}
          isBulkUpdating={bulk.isBulkUpdating}
          onSelectAll={() => bulk.selectAll(filteredTransactions)}
          onDeselectAll={bulk.deselectAll}
          onBulkUpdate={bulk.handleBulkUpdate}
          availableSubcategories={availableBulkSubcategories}
        />

        {/* Transaction List */}
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No transactions found matching your search." : "No transactions found."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredTransactions.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  showBulkUpdate={bulk.showBulkUpdate}
                  isSelected={bulk.selectedTransactions.has(t.id)}
                  onToggleSelect={bulk.toggleTransaction}
                  onEdit={onEditTransaction}
                  showAccount={showAccount}
                />
              ))}
            </ul>
          )}
        </div>
      </TabsContent>

      <TabsContent value="charts">
        <TransactionChartsView transactions={filteredTransactions} categories={categories} />
      </TabsContent>
    </Tabs>
  )
}
