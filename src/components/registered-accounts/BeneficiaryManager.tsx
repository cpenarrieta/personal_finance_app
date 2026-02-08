"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Baby } from "lucide-react"
import { toast } from "sonner"
import { BeneficiaryForm } from "./BeneficiaryForm"
import type { Id } from "../../../convex/_generated/dataModel"

interface Beneficiary {
  id: string
  name: string
  dateOfBirth: string
  notes: string | null
}

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function BeneficiaryManager() {
  const beneficiaries = useQuery(api.registeredAccounts.getBeneficiaries)
  const deleteBeneficiary = useMutation(api.registeredAccounts.deleteBeneficiary)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Beneficiary | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteBeneficiary({ id: id as Id<"respBeneficiaries"> })
      toast.success("Beneficiary deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const handleEdit = (b: Beneficiary) => {
    setEditing(b)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  if (beneficiaries === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Beneficiary
        </Button>
      </div>

      {beneficiaries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Baby className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No beneficiaries yet. Add one to create RESP accounts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {beneficiaries.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {b.name}. This cannot be undone if no RESP accounts are linked.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(b.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">DOB:</span> {b.dateOfBirth}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Age:</span> {calculateAge(b.dateOfBirth)}
                  </p>
                  {b.notes && <p className="text-muted-foreground">{b.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BeneficiaryForm beneficiary={editing} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
