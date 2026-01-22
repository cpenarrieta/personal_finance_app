"use client"

import { useState } from "react"
import { formatAmount } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
import type { TransactionForClient, CategoryForClient } from "@/types"
import type { SuggestedSplit } from "@/lib/ai/smart-analyze-receipt"

interface SmartSplitReviewModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionForClient
  suggestedSplits: SuggestedSplit[]
  categories: CategoryForClient[]
  isSubmitting: boolean
  onConfirm: () => void
  confidence?: number
  notes?: string
}

export function SmartSplitReviewModal({
  isOpen,
  onClose,
  transaction,
  suggestedSplits,
  categories,
  isSubmitting,
  onConfirm,
  confidence,
  notes,
}: SmartSplitReviewModalProps) {
  const [expandedSplits, setExpandedSplits] = useState<Set<number>>(new Set())

  const originalAmount = Math.abs(transaction.amount_number)

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedSplits)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSplits(newExpanded)
  }

  // Calculate total and validate
  const totalSplits = suggestedSplits.reduce((sum, split) => sum + split.amount, 0)
  const difference = Math.abs(totalSplits - originalAmount)
  const isValid = difference < 0.02

  // Get category and subcategory names
  const getCategoryInfo = (categoryId: string, subcategoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return { categoryName: "Unknown", subcategoryName: null }

    const subcategory = subcategoryId ? category.subcategories?.find((s) => s.id === subcategoryId) : null

    return {
      categoryName: category.name,
      subcategoryName: subcategory?.name || null,
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>AI Smart Split Suggestions</DialogTitle>
          </div>
          <DialogDescription>
            {transaction.name} • ${formatAmount(originalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Confidence Indicator */}
          {confidence !== undefined && (
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium text-foreground">AI Confidence</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      confidence >= 80 ? "bg-success" : confidence >= 60 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">{confidence}%</span>
              </div>
            </div>
          )}

          {/* Validation Indicator */}
          <div
            className={`p-4 rounded-lg border-2 ${
              isValid ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium text-foreground">{isValid ? "Splits Valid" : "Amount Mismatch"}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Splits</div>
                <div className={`text-xl font-bold ${isValid ? "text-success" : "text-destructive"}`}>
                  ${formatAmount(totalSplits)}
                </div>
              </div>
            </div>
            {!isValid && (
              <p className="text-sm text-destructive mt-2">
                Split total differs from transaction amount by ${difference.toFixed(2)}
              </p>
            )}
          </div>

          {/* Warning/Notes from AI */}
          {notes && (
            <Alert variant="default" className="border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning-foreground" />
              <div className="ml-2 text-sm text-warning-foreground">{notes}</div>
            </Alert>
          )}

          {/* Suggested Splits */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Suggested Splits ({suggestedSplits.length})</h3>
            {suggestedSplits.map((split, index) => {
              const { categoryName, subcategoryName } = getCategoryInfo(split.categoryId, split.subcategoryId)
              const isExpanded = expandedSplits.has(index)

              return (
                <Card key={index} className="p-4 border-2 hover:border-primary/30 transition-colors">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="font-medium">
                            {categoryName}
                          </Badge>
                          {subcategoryName && (
                            <Badge variant="outline" className="text-xs">
                              {subcategoryName}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground font-medium">{split.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">${formatAmount(split.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {((split.amount / originalAmount) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                    </div>

                    {/* Reasoning (Expandable) */}
                    {split.reasoning && (
                      <div className="pt-2 border-t">
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide AI Reasoning
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show AI Reasoning
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                            {split.reasoning}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!isValid || isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? "Saving..." : "Confirm & Save Splits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
