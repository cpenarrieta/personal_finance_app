"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { EditTransactionModalProps, CustomCategoryWithSubcategories, SerializedTag } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function EditTransactionModal({
  transaction,
  onClose,
}: EditTransactionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<CustomCategoryWithSubcategories[]>([]);
  const [availableTags, setAvailableTags] = useState<SerializedTag[]>([]);

  // Form state
  const [name, setName] = useState(transaction.name);
  const [customCategoryId, setCustomCategoryId] = useState(
    transaction.customCategoryId || ""
  );
  const [customSubcategoryId, setCustomSubcategoryId] = useState(
    transaction.customSubcategoryId || ""
  );
  const [notes, setNotes] = useState(transaction.notes || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    transaction.tags?.map((t) => t.id) || []
  );

  // Fetch custom categories and tags
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/custom-categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }

    async function fetchTags() {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    }

    fetchCategories();
    fetchTags();
  }, []);


  // Get subcategories for selected custom category
  const selectedCategory = categories.find((c) => c.id === customCategoryId);
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
          customCategoryId: customCategoryId || null,
          customSubcategoryId: customSubcategoryId || null,
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Transaction name"
              />
            </div>

            {/* Custom Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Category
                </label>
                <select
                  value={customCategoryId}
                  onChange={(e) => {
                    setCustomCategoryId(e.target.value);
                    setCustomSubcategoryId(""); // Reset subcategory when category changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Subcategory
                </label>
                <select
                  value={customSubcategoryId}
                  onChange={(e) => setCustomSubcategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!customCategoryId}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about this transaction..."
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <a
                  href="/settings/manage-tags"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Manage Tags
                </a>
              </div>
              {availableTags.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tags available.{" "}
                  <a
                    href="/settings/manage-tags"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Create tags
                  </a>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? "text-white ring-2 ring-offset-2"
                          : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                      }`}
                      style={
                        selectedTagIds.includes(tag.id)
                          ? { backgroundColor: tag.color }
                          : undefined
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  {Math.abs(Number(transaction.amount)).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </div>
                <div className="text-gray-600">Account:</div>
                <div className="font-medium">{transaction.account?.name}</div>
                <div className="text-gray-600">Transaction Date:</div>
                <div className="font-medium">
                  {format(new Date(transaction.date), "MMM d yyyy")}
                </div>
                <div className="text-gray-600">Creation Date:</div>
                <div className="font-medium">
                  {format(new Date(transaction.createdAt), "MMM d yyyy, h:mm a")}
                </div>
                {transaction.merchantName && (
                  <>
                    <div className="text-gray-600">Merchant:</div>
                    <div className="font-medium">
                      {transaction.merchantName}
                    </div>
                  </>
                )}
              </div>
            </div>

          {/* Action Buttons */}
          <DialogFooter className="pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
