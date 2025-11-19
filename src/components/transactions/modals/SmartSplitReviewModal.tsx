"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import type { CategoryForClient } from "@/types"
import type { SplitSuggestion } from "@/lib/ai/analyze-receipt"

interface EditableSplit extends SplitSuggestion {
  id: string // Temporary ID for React keys
}

interface SmartSplitReviewModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: SplitSuggestion[]
  transactionTotal: number
  categories: CategoryForClient[]
  onConfirm: (
    splits: Array<{
      categoryName: string
      subcategoryName: string | null
      amount: number
      itemsSummary: string
    }>,
  ) => Promise<void>
  reasoning?: string
}

export function SmartSplitReviewModal({
  isOpen,
  onClose,
  suggestions,
  transactionTotal,
  categories,
  onConfirm,
  reasoning,
}: SmartSplitReviewModalProps) {
  const [editableSplits, setEditableSplits] = useState<EditableSplit[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize editable splits when suggestions change
  useEffect(() => {
    setEditableSplits(
      suggestions.map((s, i) => ({
        ...s,
        id: `split-${i}`,
      })),
    )
  }, [suggestions])

  // Calculate current sum
  const currentSum = editableSplits.reduce((sum, split) => sum + split.amount, 0)
  const difference = Math.abs(currentSum - transactionTotal)
  const isValid = difference < 0.01 // Allow 1 cent tolerance for rounding

  // Get subcategories for a given category
  const getSubcategories = (categoryName: string) => {
    const category = categories.find((c) => c.name === categoryName)
    return category?.subcategories || []
  }

  // Handle amount change
  const handleAmountChange = (id: string, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) return

    setEditableSplits((prev) => prev.map((split) => (split.id === id ? { ...split, amount: numValue } : split)))
  }

  // Handle category change
  const handleCategoryChange = (id: string, categoryName: string) => {
    setEditableSplits((prev) =>
      prev.map((split) =>
        split.id === id
          ? {
              ...split,
              categoryName,
              subcategoryName: null, // Reset subcategory when category changes
            }
          : split,
      ),
    )
  }

  // Handle subcategory change
  const handleSubcategoryChange = (id: string, subcategoryName: string | null) => {
    setEditableSplits((prev) => prev.map((split) => (split.id === id ? { ...split, subcategoryName } : split)))
  }

  // Handle confirm
  const handleConfirm = async () => {
    if (!isValid) {
      toast.error("Split amounts must equal the transaction total")
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(
        editableSplits.map((s) => ({
          categoryName: s.categoryName,
          subcategoryName: s.subcategoryName,
          amount: s.amount,
          itemsSummary: s.itemsSummary,
        })),
      )

      toast.success("Transaction split successfully!")
      onClose()
    } catch (error) {
      console.error("Error applying splits:", error)
      toast.error(error instanceof Error ? error.message : "Failed to apply splits")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Suggested Smart Split
          </DialogTitle>
          <DialogDescription>
            Review and edit the suggested splits before applying. The AI has grouped items by category.
          </DialogDescription>
        </DialogHeader>

        {/* AI Reasoning */}
        {reasoning && (
          <Alert className="bg-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm text-muted-foreground ml-1">{reasoning}</AlertDescription>
          </Alert>
        )}

        {/* Splits Editor */}
        <div className="space-y-4">
          {editableSplits.map((split, index) => (
            <div key={split.id} className="p-4 border border-border rounded-lg bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Split {index + 1}</h4>
                <Badge variant="secondary" className="text-xs">
                  {split.confidence}% confidence
                </Badge>
              </div>

              {/* Items Summary */}
              <div>
                <Label className="text-xs text-muted-foreground">Items</Label>
                <p className="text-sm text-foreground mt-1">{split.itemsSummary}</p>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor={`amount-${split.id}`}>Amount</Label>
                <Input
                  id={`amount-${split.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={split.amount}
                  onChange={(e) => handleAmountChange(split.id, e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor={`category-${split.id}`}>Category</Label>
                <Select value={split.categoryName} onValueChange={(value) => handleCategoryChange(split.id, value)}>
                  <SelectTrigger id={`category-${split.id}`} className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              {getSubcategories(split.categoryName).length > 0 && (
                <div>
                  <Label htmlFor={`subcategory-${split.id}`}>Subcategory (Optional)</Label>
                  <Select
                    value={split.subcategoryName || "none"}
                    onValueChange={(value) => handleSubcategoryChange(split.id, value === "none" ? null : value)}
                  >
                    <SelectTrigger id={`subcategory-${split.id}`} className="mt-1">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getSubcategories(split.categoryName).map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.name}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Validation Summary */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transaction Total:</span>
            <span className="font-semibold text-foreground">${transactionTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Splits Sum:</span>
            <span className={`font-semibold ${isValid ? "text-success" : "text-destructive"}`}>
              ${currentSum.toFixed(2)}
            </span>
          </div>
          {!isValid && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-1">
                Difference: ${difference.toFixed(2)} - Please adjust amounts to match the total
              </AlertDescription>
            </Alert>
          )}
          {isValid && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>Amounts match transaction total</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? "Applying..." : "Confirm & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
