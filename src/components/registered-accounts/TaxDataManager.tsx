"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Pencil, Trash2, FileText, Upload } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { SnapshotForm } from "./SnapshotForm"
import { NOAUploadDialog } from "./NOAUploadDialog"
import type { Id } from "../../../convex/_generated/dataModel"

interface Snapshot {
  id: string
  person: "self" | "spouse"
  accountType: "RRSP" | "TFSA" | "RESP"
  taxYear: number
  earnedIncome: number | null
  noaDeductionLimit: number | null
  craRoomAsOfJan1: number | null
  noaFileKey: string | null
  notes: string | null
}

function SnapshotTable({ person, onEdit }: { person: "self" | "spouse"; onEdit: (s: Snapshot) => void }) {
  const snapshots = useQuery(api.registeredAccounts.getSnapshots, { person })
  const deleteSnapshot = useMutation(api.registeredAccounts.deleteSnapshot)

  const handleViewNoa = async (key: string) => {
    try {
      const res = await fetch("/api/noa/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      window.open(data.data.downloadUrl, "_blank")
    } catch {
      toast.error("Failed to get NOA download link")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSnapshot({ id: id as Id<"taxYearSnapshots"> })
      toast.success("Snapshot deleted")
    } catch {
      toast.error("Failed to delete snapshot")
    }
  }

  if (snapshots === undefined) {
    return <Skeleton className="h-48" />
  }

  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No tax data snapshots yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Year</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Earned Income</TableHead>
          <TableHead className="text-right">NOA Limit</TableHead>
          <TableHead className="text-right">CRA Room</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((s) => (
          <TableRow key={s.id}>
            <TableCell>{s.taxYear}</TableCell>
            <TableCell>
              <Badge variant={s.accountType === "RRSP" ? "soft" : "soft-success"}>{s.accountType}</Badge>
            </TableCell>
            <TableCell className="text-right">
              {s.earnedIncome != null ? formatCurrency(s.earnedIncome) : "—"}
            </TableCell>
            <TableCell className="text-right">
              {s.noaDeductionLimit != null ? formatCurrency(s.noaDeductionLimit) : "—"}
            </TableCell>
            <TableCell className="text-right">
              {s.craRoomAsOfJan1 != null ? formatCurrency(s.craRoomAsOfJan1) : "—"}
            </TableCell>
            <TableCell className="max-w-32 truncate text-muted-foreground text-sm">{s.notes || "—"}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {s.noaFileKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary"
                    title="View NOA PDF"
                    onClick={() => handleViewNoa(s.noaFileKey!)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(s)}>
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
                      <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete {s.accountType} data for tax year {s.taxYear}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(s.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function TaxDataManager() {
  const [tab, setTab] = useState<"self" | "spouse">("self")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Snapshot | null>(null)
  const [noaOpen, setNoaOpen] = useState(false)

  const handleEdit = (s: Snapshot) => {
    setEditing(s)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "self" | "spouse")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="self">Self</TabsTrigger>
            <TabsTrigger value="spouse">Spouse</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNoaOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Upload NOA
            </Button>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Snapshot
            </Button>
          </div>
        </div>
        <TabsContent value="self">
          <SnapshotTable person="self" onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="spouse">
          <SnapshotTable person="spouse" onEdit={handleEdit} />
        </TabsContent>
      </Tabs>

      <SnapshotForm snapshot={editing} person={tab} open={formOpen} onOpenChange={setFormOpen} />
      <NOAUploadDialog person={tab} open={noaOpen} onOpenChange={setNoaOpen} />
    </div>
  )
}
