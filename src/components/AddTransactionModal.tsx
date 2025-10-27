"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CategoryForClient,
  PlaidAccountForClient,
  TagForClient
} from "@/types";

interface AddTransactionModalProps {
  onClose: () => void;
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts: PlaidAccountForClient[];
}

export function AddTransactionModal({
  onClose,
  categories,
  tags,
  accounts,
}: AddTransactionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Required fields
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [pending, setPending] = useState(false);

  // Form state - Optional fields
  const [merchantName, setMerchantName] = useState("");
  const [isoCurrencyCode, setIsoCurrencyCode] = useState("CAD");
  const [authorizedDate, setAuthorizedDate] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [customCategoryId, setCustomCategoryId] = useState("");
  const [customSubcategoryId, setCustomSubcategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

    // Validation
    if (!accountId) {
      alert("Please select an account");
      return;
    }
    if (!name.trim()) {
      alert("Please enter a transaction name");
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      alert("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          name: name.trim(),
          amount: parseFloat(amount),
          date,
          pending,
          merchantName: merchantName.trim() || null,
          isoCurrencyCode: isoCurrencyCode || null,
          authorizedDate: authorizedDate || null,
          paymentChannel: paymentChannel || null,
          customCategoryId: customCategoryId || null,
          customSubcategoryId: customSubcategoryId || null,
          notes: notes.trim() || null,
          tagIds: selectedTagIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      // Refresh the page to show the new transaction
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create transaction. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Manual Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection - Required */}
          <div className="space-y-2">
            <Label htmlFor="account">
              Account <span className="text-red-500">*</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                    {account.mask ? ` • ${account.mask}` : ""}
                    {account.type && ` (${account.type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Name - Required */}
          <div className="space-y-2">
            <Label htmlFor="transaction-name">
              Transaction Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="transaction-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Grocery Store Purchase"
              required
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500">
                Positive for income, negative for expenses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                type="text"
                value={isoCurrencyCode}
                onChange={(e) =>
                  setIsoCurrencyCode(e.target.value.toUpperCase())
                }
                placeholder="USD"
                maxLength={3}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                Transaction Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized-date">Authorized Date</Label>
              <Input
                id="authorized-date"
                type="date"
                value={authorizedDate}
                onChange={(e) => setAuthorizedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Merchant Name */}
          <div className="space-y-2">
            <Label htmlFor="merchant-name">Merchant Name</Label>
            <Input
              id="merchant-name"
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="e.g., Whole Foods"
            />
          </div>

          {/* Payment Channel and Pending */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-channel">Payment Channel</Label>
              <Select value={paymentChannel} onValueChange={setPaymentChannel}>
                <SelectTrigger id="payment-channel">
                  <SelectValue placeholder="Select payment channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in store">In Store</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending">Status</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="pending"
                  checked={pending}
                  onCheckedChange={(checked) => setPending(checked as boolean)}
                />
                <label
                  htmlFor="pending"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Transaction is pending
                </label>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-category">Category</Label>
              <CategorySelect
                id="custom-category"
                value={customCategoryId}
                onChange={(value) => {
                  setCustomCategoryId(value);
                  setCustomSubcategoryId(""); // Reset subcategory when category changes
                }}
                categories={categories}
                placeholder="None"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-subcategory">Subcategory</Label>
              <select
                id="custom-subcategory"
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this transaction..."
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tags</Label>
              <a
                href="/settings/manage-tags"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Manage Tags
              </a>
            </div>
            {tags.length === 0 ? (
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
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={
                      selectedTagIds.includes(tag.id) ? "default" : "secondary"
                    }
                    className={`cursor-pointer transition-all ${
                      selectedTagIds.includes(tag.id)
                        ? "text-white ring-2 ring-offset-2"
                        : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                    }`}
                    style={
                      selectedTagIds.includes(tag.id)
                        ? { backgroundColor: tag.color }
                        : undefined
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
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
              {isSubmitting ? "Creating..." : "Create Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
