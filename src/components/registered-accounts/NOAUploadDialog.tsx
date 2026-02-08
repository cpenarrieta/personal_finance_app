"use client"

import { useState, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, Loader2, FileText, CheckCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Step = "upload" | "uploading" | "extracting" | "review" | "saving"

function formatDisplay(value: string): string {
  if (!value) return ""
  const num = Number(value)
  if (isNaN(num)) return value
  return num.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function parseNumericInput(input: string): string {
  return input.replace(/[^0-9.]/g, "")
}

interface ExtractedData {
  taxYear: number
  earnedIncome: number | null
  rrspDeductionLimit: number | null
  unusedRrspContributions: number | null
  tfsaRoom: number | null
  confidence: number
}

interface NOAUploadDialogProps {
  person: "self" | "spouse"
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NOAUploadDialog({ person, open, onOpenChange }: NOAUploadDialogProps) {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Review form state
  const [taxYear, setTaxYear] = useState("")
  const [earnedIncome, setEarnedIncome] = useState("")
  const [noaDeductionLimit, setNoaDeductionLimit] = useState("")
  const [tfsaRoom, setTfsaRoom] = useState("")

  const upsertSnapshot = useMutation(api.registeredAccounts.upsertSnapshot)

  const reset = () => {
    setStep("upload")
    setFile(null)
    setR2Key(null)
    setExtracted(null)
    setError(null)
    setTaxYear("")
    setEarnedIncome("")
    setNoaDeductionLimit("")
    setTfsaRoom("")
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.type === "application/pdf") {
      setFile(f)
      setError(null)
    } else {
      setError("Please select a PDF file")
    }
  }

  const handleUploadAndExtract = async () => {
    if (!file) return

    try {
      // Step 1: Get presigned URL
      setStep("uploading")
      const presignRes = await fetch("/api/noa/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person }),
      })
      const presignData = await presignRes.json()
      if (!presignData.success) throw new Error(presignData.error)

      const { presignedUrl, key } = presignData.data

      // Step 2: Upload to R2
      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      })
      setR2Key(key)

      // Step 3: Extract
      setStep("extracting")
      const extractRes = await fetch("/api/noa/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      const extractData = await extractRes.json()
      if (!extractData.success) throw new Error(extractData.error)

      const data = extractData.data as ExtractedData
      setExtracted(data)

      // Pre-fill review form
      setTaxYear(String(data.taxYear))
      setEarnedIncome(data.earnedIncome != null ? String(data.earnedIncome) : "")
      setNoaDeductionLimit(data.rrspDeductionLimit != null ? String(data.rrspDeductionLimit) : "")
      setTfsaRoom(data.tfsaRoom != null ? String(data.tfsaRoom) : "")

      setStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setStep("upload")
    }
  }

  const handleSave = async () => {
    if (!r2Key) return
    setStep("saving")

    try {
      const year = Number(taxYear)
      const promises: Promise<unknown>[] = []

      // Save RRSP snapshot if we have deduction limit or earned income
      if (noaDeductionLimit || earnedIncome) {
        promises.push(
          upsertSnapshot({
            person,
            accountType: "RRSP",
            taxYear: year,
            ...(earnedIncome ? { earnedIncome: Number(earnedIncome) } : {}),
            ...(noaDeductionLimit ? { noaDeductionLimit: Number(noaDeductionLimit) } : {}),
            noaFileKey: r2Key,
            notes: "Imported from NOA",
          }),
        )
      }

      // Save TFSA snapshot if we have room
      if (tfsaRoom) {
        promises.push(
          upsertSnapshot({
            person,
            accountType: "TFSA",
            taxYear: year,
            craRoomAsOfJan1: Number(tfsaRoom),
            noaFileKey: r2Key,
            notes: "Imported from NOA",
          }),
        )
      }

      if (promises.length === 0) {
        toast.error("No data to save — fill in at least one field")
        setStep("review")
        return
      }

      await Promise.all(promises)
      toast.success("NOA data saved")
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
      setStep("review")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Notice of Assessment</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CRA Notice of Assessment PDF to auto-extract tax data for{" "}
              <span className="font-medium capitalize">{person}</span>.
            </p>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select PDF</p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadAndExtract} disabled={!file}>
                <Upload className="h-4 w-4 mr-1" />
                Upload & Extract
              </Button>
            </div>
          </div>
        )}

        {/* Step: Uploading */}
        {step === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading PDF...</p>
          </div>
        )}

        {/* Step: Extracting */}
        {step === "extracting" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting data from NOA...</p>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && extracted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Extraction complete</span>
              <Badge
                variant={
                  extracted.confidence >= 80 ? "soft-success" : extracted.confidence >= 50 ? "soft" : "soft-destructive"
                }
              >
                {extracted.confidence}% confidence
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Tax Year</Label>
                <Input type="number" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Earned Income</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatDisplay(earnedIncome)}
                  onChange={(e) => setEarnedIncome(parseNumericInput(e.target.value))}
                  placeholder="Not found in NOA"
                />
              </div>
              <div className="space-y-1">
                <Label>RRSP Deduction Limit</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatDisplay(noaDeductionLimit)}
                  onChange={(e) => setNoaDeductionLimit(parseNumericInput(e.target.value))}
                  placeholder="Not found in NOA"
                />
              </div>
              <div className="space-y-1">
                <Label>TFSA Room</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatDisplay(tfsaRoom)}
                  onChange={(e) => setTfsaRoom(parseNumericInput(e.target.value))}
                  placeholder="Not found in NOA"
                />
              </div>
            </div>

            {extracted.unusedRrspContributions != null && (
              <p className="text-xs text-muted-foreground">
                Unused RRSP contributions: {formatCurrency(extracted.unusedRrspContributions)}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Snapshots</Button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === "saving" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Saving...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
