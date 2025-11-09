"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import type { SplitTransactionModalProps, SplitItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CategorySelect } from "@/components/ui/category-select";
import { SubcategorySelect } from "@/components/ui/subcategory-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SplitTransactionModal({
  transaction,
  onClose,
  categories,
}: SplitTransactionModalProps) {
  const router = useRouter();
  const [splits, setSplits] = useState<SplitItem[]>([
    {
      amount: "",
      categoryId: null,
      subcategoryId: null,
      notes: "",
      description: "",
    },
    {
      amount: "",
      categoryId: null,
      subcategoryId: null,
      notes: "",
      description: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalAmount = transaction.amount_number;

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        amount: "",
        categoryId: null,
        subcategoryId: null,
        notes: "",
        description: "",
      },
    ]);
  };

  const removeSplit = (index: number) => {
    if (splits.length > 2) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };

  const updateSplit = (
    index: number,
    field: keyof SplitItem,
    value: string | null
  ) => {
    const newSplits = [...splits];
    const currentSplit = newSplits[index];
    if (currentSplit) {
      newSplits[index] = { ...currentSplit, [field]: value };

      // If category changes, reset subcategory
      if (field === "categoryId") {
        newSplits[index]!.subcategoryId = null;
      }
    }

    setSplits(newSplits);
    setError(null);
  };

  const getTotalSplitAmount = (): number => {
    return splits.reduce((sum, split) => {
      const amount = parseFloat(split.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const getRemainingAmount = (): number => {
    return originalAmount - getTotalSplitAmount();
  };

  const validate = (): boolean => {
    // Check all splits have amounts
    for (const split of splits) {
      if (!split.amount || parseFloat(split.amount) <= 0) {
        setError("All splits must have a positive amount");
        return false;
      }
    }

    // Check total equals original
    const totalSplit = getTotalSplitAmount();
    if (Math.abs(totalSplit - originalAmount) > 0.01) {
      setError(
        `Split amounts ($${totalSplit.toFixed(
          2
        )}) must equal original amount ($${originalAmount.toFixed(2)})`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/transactions/${transaction.id}/split`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ splits }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to split transaction");
        setIsSubmitting(false);
        return;
      }

      // Success - refresh and close
      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error splitting transaction:", err);
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  // No longer needed - SubcategorySelect handles this internally

  const remaining = getRemainingAmount();
  const isValid = Math.abs(remaining) < 0.01;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Transaction</DialogTitle>
          <DialogDescription>
            {transaction.name} • ${formatAmount(originalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Remaining Amount Indicator */}
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${
              isValid
                ? "bg-success/10 border-success/30"
                : remaining > 0
                ? "bg-warning/10 border-warning/30"
                : "bg-destructive/10 border-destructive/30"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">
                Remaining to allocate:
              </span>
              <span
                className={`text-2xl font-bold ${
                  isValid
                    ? "text-success"
                    : remaining > 0
                    ? "text-warning-foreground"
                    : "text-destructive"
                }`}
              >
                ${formatAmount(remaining)}
              </span>
            </div>
            {isValid && (
              <p className="text-sm text-success mt-1">
                Perfect! All amounts are allocated.
              </p>
            )}
          </div>

          {/* Split Items */}
          <div className="space-y-4">
            {splits.map((split, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-foreground">
                    Split #{index + 1}
                  </h3>
                  {splits.length > 2 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSplit(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor={`split-amount-${index}`}>Amount *</Label>
                    <Input
                      id={`split-amount-${index}`}
                      type="text"
                      inputMode="decimal"
                      value={split.amount}
                      onChange={(e) => {
                        // Only allow valid number input
                        const value = e.target.value;
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          updateSplit(index, "amount", value);
                        }
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor={`split-description-${index}`}>
                      Description (optional)
                    </Label>
                    <Input
                      id={`split-description-${index}`}
                      type="text"
                      value={split.description}
                      onChange={(e) =>
                        updateSplit(index, "description", e.target.value)
                      }
                      placeholder={`${transaction.name} (Split ${index + 1}/${
                        splits.length
                      })`}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor={`split-category-${index}`}>Category</Label>
                    <CategorySelect
                      id={`split-category-${index}`}
                      value={split.categoryId || ""}
                      onChange={(value) =>
                        updateSplit(index, "categoryId", value || null)
                      }
                      categories={categories}
                      placeholder="No Category"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Subcategory */}
                  <div className="space-y-2">
                    <Label htmlFor={`split-subcategory-${index}`}>
                      Subcategory
                    </Label>
                    <SubcategorySelect
                      id={`split-subcategory-${index}`}
                      value={split.subcategoryId || ""}
                      onChange={(value) =>
                        updateSplit(index, "subcategoryId", value || null)
                      }
                      categories={categories}
                      categoryId={split.categoryId}
                      placeholder="No Subcategory"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor={`split-notes-${index}`}>Notes</Label>
                    <Textarea
                      id={`split-notes-${index}`}
                      value={split.notes}
                      onChange={(e) =>
                        updateSplit(index, "notes", e.target.value)
                      }
                      rows={2}
                      placeholder="Add any notes for this split..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Split Button */}
          <button
            onClick={addSplit}
            className="mt-4 w-full py-2 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Add Another Split
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-foreground bg-card border rounded-lg hover:bg-muted/50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={!isValid || isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Splitting..." : "Split Transaction"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
