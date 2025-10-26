"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CustomCategoryWithSubcategories,
  CustomSubcategory,
  SerializedTransaction,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CategorySelect } from "@/components/ui/category-select";

interface SplitItem {
  amount: string;
  customCategoryId: string | null;
  customSubcategoryId: string | null;
  notes: string;
  description: string;
}

interface SplitTransactionModalProps {
  transaction: SerializedTransaction;
  onClose: () => void;
  categories: CustomCategoryWithSubcategories[];
}

export function SplitTransactionModal({
  transaction,
  onClose,
  categories,
}: SplitTransactionModalProps) {
  const router = useRouter();
  const [splits, setSplits] = useState<SplitItem[]>([
    {
      amount: "",
      customCategoryId: null,
      customSubcategoryId: null,
      notes: "",
      description: "",
    },
    {
      amount: "",
      customCategoryId: null,
      customSubcategoryId: null,
      notes: "",
      description: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalAmount = Number(transaction.amount);

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        amount: "",
        customCategoryId: null,
        customSubcategoryId: null,
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
      if (field === "customCategoryId") {
        newSplits[index]!.customSubcategoryId = null;
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

  const getSubcategoriesForCategory = (
    categoryId: string | null
  ): CustomSubcategory[] => {
    if (!categoryId) return [];
    const category = categories.find((c) => c.id === categoryId);
    return category?.subcategories || [];
  };

  const remaining = getRemainingAmount();
  const isValid = Math.abs(remaining) < 0.01;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Split Transaction</DialogTitle>
          <DialogDescription>
            {transaction.name} • $
            {Math.abs(originalAmount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Remaining Amount Indicator */}
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${
              isValid
                ? "bg-green-50 border-green-300"
                : remaining > 0
                ? "bg-yellow-50 border-yellow-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">
                Remaining to allocate:
              </span>
              <span
                className={`text-2xl font-bold ${
                  isValid
                    ? "text-green-600"
                    : remaining > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                $
                {Math.abs(remaining).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {isValid && (
              <p className="text-sm text-green-700 mt-1">
                Perfect! All amounts are allocated.
              </p>
            )}
          </div>

          {/* Split Items */}
          <div className="space-y-4">
            {splits.map((split, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Split #{index + 1}
                  </h3>
                  {splits.length > 2 && (
                    <button
                      onClick={() => removeSplit(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={split.description}
                      onChange={(e) =>
                        updateSplit(index, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`${transaction.name} (Split ${index + 1}/${
                        splits.length
                      })`}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <CategorySelect
                      value={split.customCategoryId || ""}
                      onChange={(value) =>
                        updateSplit(index, "customCategoryId", value || null)
                      }
                      categories={categories}
                      placeholder="No Category"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>
                    <select
                      value={split.customSubcategoryId || ""}
                      onChange={(e) =>
                        updateSplit(
                          index,
                          "customSubcategoryId",
                          e.target.value || null
                        )
                      }
                      disabled={!split.customCategoryId}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">No Subcategory</option>
                      {getSubcategoriesForCategory(split.customCategoryId).map(
                        (sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={split.notes}
                      onChange={(e) =>
                        updateSplit(index, "notes", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            + Add Another Split
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={!isValid || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Splitting..." : "Split Transaction"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
