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

interface Beneficiary {
  id: string
  name: string
  dateOfBirth: string
  notes: string | null
}

interface BeneficiaryFormProps {
  beneficiary: Beneficiary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BeneficiaryForm({ beneficiary, open, onOpenChange }: BeneficiaryFormProps) {
  const [name, setName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [notes, setNotes] = useState("")

  const addBeneficiary = useMutation(api.registeredAccounts.addBeneficiary)
  const updateBeneficiary = useMutation(api.registeredAccounts.updateBeneficiary)

  useEffect(() => {
    if (beneficiary) {
      setName(beneficiary.name)
      setDateOfBirth(beneficiary.dateOfBirth)
      setNotes(beneficiary.notes || "")
    } else {
      setName("")
      setDateOfBirth("")
      setNotes("")
    }
  }, [beneficiary, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (beneficiary) {
        await updateBeneficiary({
          id: beneficiary.id as Id<"respBeneficiaries">,
          name,
          dateOfBirth,
          notes: notes || undefined,
        })
        toast.success("Beneficiary updated")
      } else {
        await addBeneficiary({
          name,
          dateOfBirth,
          ...(notes ? { notes } : {}),
        })
        toast.success("Beneficiary added")
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save beneficiary")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{beneficiary ? "Edit" : "Add"} Beneficiary</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Child's name" />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{beneficiary ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
