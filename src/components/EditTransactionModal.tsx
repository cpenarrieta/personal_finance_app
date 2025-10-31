"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { formatAmount } from "@/lib/utils";
import type { EditTransactionModalProps } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/ui/category-select";
import { Button } from "@/components/ui/button";
import { TagSelector } from "@/components/TagSelector";

export function EditTransactionModal({
  transaction,
  onClose,
  categories,
  tags,
}: EditTransactionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(transaction.name);
  const [categoryId, setCategoryId] = useState(
    transaction.categoryId || ""
  );
  const [subcategoryId, setSubcategoryId] = useState(
    transaction.subcategoryId || ""
  );
  const [notes, setNotes] = useState(transaction.notes || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    transaction.tags?.map((tag) => tag.id) || []
  );

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const availableSubcategories = selectedCategory?.subcategories || [];

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          notes: notes || null,
          tagIds: selectedTagIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }

      // Refresh the page to show updated data
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Name */}
          <div className="space-y-2">
            <Label htmlFor="transaction-name">Transaction Name</Label>
            <Input
              id="transaction-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Transaction name"
            />
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                id="category"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setSubcategoryId(""); // Reset subcategory when category changes
                }}
                categories={categories}
                placeholder="None"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <select
                id="subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!categoryId}
              >
                <option value="">None</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any notes about this transaction..."
              autoFocus
            />
          </div>

          {/* Tags */}
          <TagSelector
            tags={tags}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTag}
          />

          {/* Transaction Details (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Transaction Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Transaction ID:</div>
              <div className="font-medium font-mono text-xs">
                {transaction.id}
              </div>
              <div className="text-gray-600">Amount:</div>
              <div className="font-medium">
                $
                {formatAmount(transaction.amount_number)}
              </div>
              <div className="text-gray-600">Account:</div>
              <div className="font-medium">{transaction.account?.name}</div>
              <div className="text-gray-600">Transaction Date:</div>
              <div className="font-medium">
                {format(new Date(transaction.date_string), "MMM d yyyy")}
              </div>
              <div className="text-gray-600">Creation Date:</div>
              <div className="font-medium">
                {format(new Date(transaction.created_at_string), "MMM d yyyy, h:mm a")}
              </div>
              {transaction.merchantName && (
                <>
                  <div className="text-gray-600">Merchant:</div>
                  <div className="font-medium">{transaction.merchantName}</div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
