"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"

interface Transaction {
  id: string
  type: "contribution" | "withdrawal" | "grant"
  amount: number
  date: string
  taxYear: number
  notes: string | null
}

interface EditTransactionDialogProps {
  transaction: Transaction | null
  accountType: "RRSP" | "TFSA" | "RESP"
  onClose: () => void
}

export function EditTransactionDialog({ transaction, accountType, onClose }: EditTransactionDialogProps) {
  const [type, setType] = useState<"contribution" | "withdrawal" | "grant">("contribution")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [taxYear, setTaxYear] = useState("")
  const [notes, setNotes] = useState("")

  const updateTransaction = useMutation(api.registeredAccounts.updateTransaction)

  useEffect(() => {
    if (transaction) {
      setType(transaction.type)
      setAmount(String(transaction.amount))
      setDate(transaction.date)
      setTaxYear(String(transaction.taxYear))
      setNotes(transaction.notes || "")
    }
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction) return
    try {
      await updateTransaction({
        id: transaction.id as Id<"registeredTransactions">,
        type,
        amount: Number(amount),
        date,
        taxYear: Number(taxYear),
        notes: notes || undefined,
      })
      toast.success("Transaction updated")
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update transaction")
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "contribution" | "withdrawal" | "grant")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="contribution">Contribution</option>
              <option value="withdrawal">Withdrawal</option>
              {accountType === "RESP" && <option value="grant">Grant</option>}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tax Year</Label>
              <Input type="number" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
