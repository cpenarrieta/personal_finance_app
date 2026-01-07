"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TransactionForClient, CategoryForClient } from "@/types"

interface TransactionActionBarProps {
  filteredTransactions: TransactionForClient[]
  totalTransactions: number
  categories: CategoryForClient[]
  showBulkUpdate: boolean
  onToggleBulkUpdate: () => void
  bulkCategoryId: string
  bulkSubcategoryId: string
  setBulkCategoryId: (value: string) => void
  setBulkSubcategoryId: (value: string) => void
  selectedTransactions: Set<string>
  isBulkUpdating: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkUpdate: () => void
  availableSubcategories: Array<{ id: string; name: string }>
}

export function TransactionActionBar({
  filteredTransactions,
  totalTransactions,
  categories,
  showBulkUpdate,
  onToggleBulkUpdate,
  bulkCategoryId,
  bulkSubcategoryId,
  setBulkCategoryId,
  setBulkSubcategoryId,
  selectedTransactions,
  isBulkUpdating,
  onSelectAll,
  onDeselectAll,
  onBulkUpdate,
  availableSubcategories,
}: TransactionActionBarProps) {
  return (
    <>
      {/* Action Bar */}
      <div className="bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredTransactions.length} of {totalTransactions} transactions
          </div>
          {filteredTransactions.length > 0 && (
            <Button onClick={onToggleBulkUpdate} className="bg-primary hover:bg-primary/90">
              {showBulkUpdate ? "Hide Bulk Update" : "Bulk Update"}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Update Panel */}
      {showBulkUpdate && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Bulk Update Categories</h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSelectAll} className="bg-primary hover:bg-primary/90">
                Select All ({filteredTransactions.length})
              </Button>
              <Button size="sm" onClick={onDeselectAll} variant="secondary">
                Deselect All
              </Button>
            </div>
          </div>

          {selectedTransactions.size > 0 && (
            <div className="bg-card rounded-lg p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-3">
                Selected {selectedTransactions.size} transaction
                {selectedTransactions.size !== 1 ? "s" : ""}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">Category</Label>
                  <Select
                    value={bulkCategoryId}
                    onValueChange={(value) => {
                      setBulkCategoryId(value)
                      setBulkSubcategoryId("")
                    }}
                  >
                    <SelectTrigger id="bulk-category">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-subcategory">Subcategory</Label>
                  <Select value={bulkSubcategoryId} onValueChange={setBulkSubcategoryId} disabled={!bulkCategoryId}>
                    <SelectTrigger id="bulk-subcategory">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {availableSubcategories.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={onBulkUpdate}
                  disabled={!bulkCategoryId || isBulkUpdating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isBulkUpdating
                    ? "Updating..."
                    : `Update ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
