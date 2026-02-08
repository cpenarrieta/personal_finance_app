"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"

export function AddAccountDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<"RRSP" | "TFSA" | "RESP">("RESP")
  const [owner, setOwner] = useState<"self" | "spouse">("self")
  const [contributor, setContributor] = useState<"self" | "spouse">("self")
  const [beneficiaryId, setBeneficiaryId] = useState("")
  const [roomStartYear, setRoomStartYear] = useState("")
  const [notes, setNotes] = useState("")

  const addAccount = useMutation(api.registeredAccounts.addAccount)
  const beneficiaries = useQuery(api.registeredAccounts.getBeneficiaries)

  const resetForm = () => {
    setName("")
    setAccountType("RESP")
    setOwner("self")
    setContributor("self")
    setBeneficiaryId("")
    setRoomStartYear("")
    setNotes("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addAccount({
        name,
        accountType,
        owner,
        contributor,
        ...(accountType === "RESP" && beneficiaryId ? { beneficiaryId: beneficiaryId as Id<"respBeneficiaries"> } : {}),
        ...(accountType === "TFSA" && roomStartYear ? { roomStartYear: Number(roomStartYear) } : {}),
        ...(notes ? { notes } : {}),
      })
      toast.success("Account created")
      resetForm()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., Child RESP" />
          </div>
          <div className="space-y-2">
            <Label>Account Type</Label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as "RRSP" | "TFSA" | "RESP")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="RRSP">RRSP</option>
              <option value="TFSA">TFSA</option>
              <option value="RESP">RESP</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as "self" | "spouse")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Contributor</Label>
              <select
                value={contributor}
                onChange={(e) => setContributor(e.target.value as "self" | "spouse")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
              </select>
            </div>
          </div>
          {accountType === "RESP" && (
            <div className="space-y-2">
              <Label>Beneficiary</Label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select beneficiary...</option>
                {beneficiaries?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {accountType === "TFSA" && (
            <div className="space-y-2">
              <Label>Room Start Year</Label>
              <Input
                type="number"
                value={roomStartYear}
                onChange={(e) => setRoomStartYear(e.target.value)}
                placeholder="e.g., 2009"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
