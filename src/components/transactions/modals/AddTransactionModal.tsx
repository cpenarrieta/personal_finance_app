"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { logError } from "@/lib/utils/logger"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CategorySelect } from "@/components/ui/category-select"
import { Button } from "@/components/ui/button"
import { TagSelector } from "@/components/transactions/filters/TagSelector"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CategoryForClient, PlaidAccountForClient, TagForClient } from "@/types"

interface AddTransactionModalProps {
  onClose: () => void
  categories: CategoryForClient[]
  tags: TagForClient[]
  accounts: PlaidAccountForClient[]
}

export function AddTransactionModal({ onClose, categories, tags, accounts }: AddTransactionModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state - Required fields
  const [accountId, setAccountId] = useState("")
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [pending, setPending] = useState(false)

  // Form state - Optional fields
  const [merchantName, setMerchantName] = useState("")
  const [isoCurrencyCode, setIsoCurrencyCode] = useState("CAD")
  const [authorizedDate, setAuthorizedDate] = useState("")
  const [paymentChannel, setPaymentChannel] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [subcategoryId, setSubcategoryId] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const availableSubcategories = selectedCategory?.subcategories || []

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!accountId) {
      alert("Please select an account")
      return
    }
    if (!name.trim()) {
      alert("Please enter a transaction name")
      return
    }
    if (!amount || isNaN(parseFloat(amount))) {
      alert("Please enter a valid amount")
      return
    }

    setIsSubmitting(true)

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
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          notes: notes.trim() || null,
          tagIds: selectedTagIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create transaction")
      }

      // Refresh the page to show the new transaction
      router.refresh()
      onClose()
    } catch (error) {
      logError("Error creating transaction:", error)
      alert(error instanceof Error ? error.message : "Failed to create transaction. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <p className="text-xs text-gray-500">Positive for income, negative for expenses</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                type="text"
                value={isoCurrencyCode}
                onChange={(e) => setIsoCurrencyCode(e.target.value.toUpperCase())}
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {date ? format(new Date(date), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date) : undefined}
                    onSelect={(selectedDate) => setDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "")}
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized-date">Authorized Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {authorizedDate ? format(new Date(authorizedDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={authorizedDate ? new Date(authorizedDate) : undefined}
                    onSelect={(selectedDate) =>
                      setAuthorizedDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "")
                    }
                    weekStartsOn={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                id="category"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value)
                  setSubcategoryId("") // Reset subcategory when category changes
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
              rows={3}
              placeholder="Add any notes about this transaction..."
            />
          </div>

          {/* Tags */}
          <TagSelector tags={tags} selectedTagIds={selectedTagIds} onToggleTag={toggleTag} />

          {/* Action Buttons */}
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
