"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"

interface AddTransactionDialogProps {
  accountId: string
  accountType: "RRSP" | "TFSA" | "RESP"
}

export function AddTransactionDialog({ accountId, accountType }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"contribution" | "withdrawal" | "grant">("contribution")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()))
  const [notes, setNotes] = useState("")

  const addTransaction = useMutation(api.registeredAccounts.addTransaction)

  const resetForm = () => {
    setType("contribution")
    setAmount("")
    setDate(new Date().toISOString().slice(0, 10))
    setTaxYear(String(new Date().getFullYear()))
    setNotes("")
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    if (newDate.length === 10) {
      setTaxYear(newDate.slice(0, 4))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTransaction({
        registeredAccountId: accountId as Id<"registeredAccounts">,
        type,
        amount: Number(amount),
        date,
        taxYear: Number(taxYear),
        ...(notes ? { notes } : {}),
      })
      toast.success("Transaction added")
      resetForm()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add transaction")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
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
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} required />
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
