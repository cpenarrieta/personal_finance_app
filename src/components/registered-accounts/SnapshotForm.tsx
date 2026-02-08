"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { NOADiscrepancyAlert } from "./NOADiscrepancyAlert"

interface Snapshot {
  id: string
  person: "self" | "spouse"
  accountType: "RRSP" | "TFSA" | "RESP"
  taxYear: number
  earnedIncome: number | null
  noaDeductionLimit: number | null
  craRoomAsOfJan1: number | null
  notes: string | null
}

interface SnapshotFormProps {
  snapshot: Snapshot | null
  person: "self" | "spouse"
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SnapshotForm({ snapshot, person, open, onOpenChange }: SnapshotFormProps) {
  const [accountType, setAccountType] = useState<"RRSP" | "TFSA">("RRSP")
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1))
  const [earnedIncome, setEarnedIncome] = useState("")
  const [noaDeductionLimit, setNoaDeductionLimit] = useState("")
  const [craRoomAsOfJan1, setCraRoomAsOfJan1] = useState("")
  const [notes, setNotes] = useState("")
  const [savedRRSP, setSavedRRSP] = useState<{ person: "self" | "spouse"; taxYear: number } | null>(null)

  const upsertSnapshot = useMutation(api.registeredAccounts.upsertSnapshot)

  useEffect(() => {
    if (snapshot) {
      setAccountType(snapshot.accountType as "RRSP" | "TFSA")
      setTaxYear(String(snapshot.taxYear))
      setEarnedIncome(snapshot.earnedIncome != null ? String(snapshot.earnedIncome) : "")
      setNoaDeductionLimit(snapshot.noaDeductionLimit != null ? String(snapshot.noaDeductionLimit) : "")
      setCraRoomAsOfJan1(snapshot.craRoomAsOfJan1 != null ? String(snapshot.craRoomAsOfJan1) : "")
      setNotes(snapshot.notes || "")
      setSavedRRSP(null)
    } else {
      setAccountType("RRSP")
      setTaxYear(String(new Date().getFullYear() - 1))
      setEarnedIncome("")
      setNoaDeductionLimit("")
      setCraRoomAsOfJan1("")
      setNotes("")
      setSavedRRSP(null)
    }
  }, [snapshot, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await upsertSnapshot({
        person,
        accountType,
        taxYear: Number(taxYear),
        ...(accountType === "RRSP" && earnedIncome ? { earnedIncome: Number(earnedIncome) } : {}),
        ...(accountType === "RRSP" && noaDeductionLimit ? { noaDeductionLimit: Number(noaDeductionLimit) } : {}),
        ...(accountType === "TFSA" && craRoomAsOfJan1 ? { craRoomAsOfJan1: Number(craRoomAsOfJan1) } : {}),
        ...(notes ? { notes } : {}),
      })
      toast.success("Snapshot saved")
      if (accountType === "RRSP" && noaDeductionLimit) {
        setSavedRRSP({ person, taxYear: Number(taxYear) })
      } else {
        onOpenChange(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save snapshot")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{snapshot ? "Edit" : "Add"} Tax Data Snapshot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account Type</Label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as "RRSP" | "TFSA")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!!snapshot}
            >
              <option value="RRSP">RRSP</option>
              <option value="TFSA">TFSA</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tax Year</Label>
            <Input
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              required
              disabled={!!snapshot}
            />
          </div>
          {accountType === "RRSP" && (
            <>
              <div className="space-y-2">
                <Label>Earned Income</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={earnedIncome}
                  onChange={(e) => setEarnedIncome(e.target.value)}
                  placeholder="Salary / self-employment income"
                />
              </div>
              <div className="space-y-2">
                <Label>NOA Deduction Limit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={noaDeductionLimit}
                  onChange={(e) => setNoaDeductionLimit(e.target.value)}
                  placeholder="From Notice of Assessment"
                />
              </div>
            </>
          )}
          {accountType === "TFSA" && (
            <div className="space-y-2">
              <Label>CRA Room as of Jan 1</Label>
              <Input
                type="number"
                step="0.01"
                value={craRoomAsOfJan1}
                onChange={(e) => setCraRoomAsOfJan1(e.target.value)}
                placeholder="From CRA My Account"
              />
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
        {savedRRSP && <NOADiscrepancyAlert person={savedRRSP.person} accountType="RRSP" taxYear={savedRRSP.taxYear} />}
      </DialogContent>
    </Dialog>
  )
}
