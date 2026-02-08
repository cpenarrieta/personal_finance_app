"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { Id } from "../../../convex/_generated/dataModel"

interface AccountSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: {
    id: string
    name: string
    accountType: "RRSP" | "TFSA" | "RESP"
    roomStartYear: number | null
    beneficiaryId: string | null
    notes: string | null
  }
}

export function AccountSettingsSheet({ open, onOpenChange, account }: AccountSettingsSheetProps) {
  const [name, setName] = useState(account.name)
  const [roomStartYear, setRoomStartYear] = useState(account.roomStartYear ? String(account.roomStartYear) : "")
  const [beneficiaryId, setBeneficiaryId] = useState(account.beneficiaryId || "")
  const [notes, setNotes] = useState(account.notes || "")

  const updateAccount = useMutation(api.registeredAccounts.updateAccount)
  const beneficiaries = useQuery(api.registeredAccounts.getBeneficiaries)

  useEffect(() => {
    setName(account.name)
    setRoomStartYear(account.roomStartYear ? String(account.roomStartYear) : "")
    setBeneficiaryId(account.beneficiaryId || "")
    setNotes(account.notes || "")
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateAccount({
        id: account.id as Id<"registeredAccounts">,
        name,
        ...(account.accountType === "TFSA" && roomStartYear ? { roomStartYear: Number(roomStartYear) } : {}),
        ...(account.accountType === "RESP" && beneficiaryId
          ? { beneficiaryId: beneficiaryId as Id<"respBeneficiaries"> }
          : {}),
        notes: notes || undefined,
      })
      toast.success("Account updated")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Account Settings</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {account.accountType === "TFSA" && (
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
          {account.accountType === "RESP" && (
            <div className="space-y-2">
              <Label>Beneficiary</Label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
