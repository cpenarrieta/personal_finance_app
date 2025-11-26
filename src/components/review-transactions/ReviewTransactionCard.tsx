"use client"

import { useState } from "react"
import type { TransactionForClient, CategoryForClient, TagForClient } from "@/types"
import { CategorySelect } from "@/components/ui/category-select"
import { SubcategorySelect } from "@/components/ui/subcategory-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { TagSelector } from "@/components/transactions/filters/TagSelector"
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react"

interface TransactionEdit {
  id: string
  categoryId: string | null
  subcategoryId: string | null
  notes: string | null
  newAmount: number | null
  tagIds: string[]
  isSelected: boolean
}

interface ReviewTransactionCardProps {
  transaction: TransactionForClient
  edit: TransactionEdit
  categories: CategoryForClient[]
  tags: TagForClient[]
  onToggleSelection: () => void
  onUpdateEdit: (update: Partial<TransactionEdit>) => void
  onFlipAmount: () => void
}

export function ReviewTransactionCard({
  transaction,
  edit,
  categories,
  tags,
  onToggleSelection,
  onUpdateEdit,
  onFlipAmount,
}: ReviewTransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const needsCategory = !edit.categoryId
  const displayAmount = edit.newAmount !== null ? edit.newAmount : transaction.amount_number
  const hasForReviewTag = transaction.tags.some((tag) => tag.name === "for-review")

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const month = date.toLocaleDateString("en-US", { month: "short" })
    const day = date.getDate()
    return `${month} ${day}`
  }

  return (
    <Card className={`${!edit.isSelected ? "opacity-50" : ""}`}>
      <div className="p-3 space-y-3">
        {/* Header row: Checkbox + Name + Amount */}
        <div className="flex items-start gap-2">
          <Checkbox
            checked={edit.isSelected}
            onCheckedChange={onToggleSelection}
            aria-label={`Select transaction ${transaction.name}`}
            className="mt-0.5 flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate text-sm">
              {transaction.merchantName || transaction.name}
            </div>
            {transaction.merchantName !== transaction.name && (
              <div className="text-xs text-muted-foreground truncate">{transaction.name}</div>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span
              className={`font-semibold text-sm whitespace-nowrap ${edit.newAmount !== null ? "text-primary" : "text-foreground"}`}
            >
              {formatCurrency(displayAmount)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 -mr-1"
              onClick={onFlipAmount}
              title="Flip amount sign"
            >
              <ArrowLeftRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Date, account & badges */}
        <div className="pl-7 space-y-2">
          <div className="text-xs text-muted-foreground/70 truncate">
            {formatDate(transaction.datetime)} • {transaction.account?.name || "Unknown"}
          </div>

          {/* Status badges */}
          {(needsCategory || hasForReviewTag) && (
            <div className="flex gap-2 flex-wrap">
              {needsCategory && (
                <Badge variant="destructive" className="text-xs">
                  Uncategorized
                </Badge>
              )}
              {hasForReviewTag && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700 dark:text-yellow-400">
                  For Review
                </Badge>
              )}
            </div>
          )}

          {/* Category selection - Always visible */}
          <div className="space-y-2">
            <CategorySelect
              value={edit.categoryId || ""}
              onChange={(value) => {
                onUpdateEdit({
                  categoryId: value || null,
                  subcategoryId: null,
                })
              }}
              categories={categories}
              placeholder="Select category..."
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input"
            />
            <SubcategorySelect
              value={edit.subcategoryId || ""}
              onChange={(value) => {
                onUpdateEdit({ subcategoryId: value || null })
              }}
              categories={categories}
              categoryId={edit.categoryId}
              placeholder="None"
              className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Expandable section */}
        {isExpanded && (
          <div className="pl-7 space-y-3 pt-2 border-t border-border">
            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
              <TagSelector
                tags={tags}
                selectedTagIds={edit.tagIds}
                onToggleTag={(tagId) => {
                  const newTagIds = edit.tagIds.includes(tagId)
                    ? edit.tagIds.filter((id) => id !== tagId)
                    : [...edit.tagIds, tagId]
                  onUpdateEdit({ tagIds: newTagIds })
                }}
                label=""
                showManageLink={false}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
              <Input
                value={edit.notes || ""}
                onChange={(e) => {
                  onUpdateEdit({ notes: e.target.value || null })
                }}
                placeholder="Add notes..."
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Expand/Collapse button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {isExpanded ? (
            <>
              <span>Less</span>
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>Tags & Notes</span>
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>
    </Card>
  )
}
