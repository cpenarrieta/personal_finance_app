"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, FileText, Image as ImageIcon, File, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { logError } from "@/lib/utils/logger"

interface TransactionFileUploadProps {
  transactionId: string
  files: string[]
  onFilesUpdate: (files: string[]) => void
}

export function TransactionFileUpload({ transactionId, files, onFilesUpdate }: TransactionFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPreviewUrls = useCallback(async () => {
    const imageKeys = files.filter((key) => {
      const ext = key.split(".").pop()?.toLowerCase()
      return ext && ["jpg", "jpeg", "png", "webp"].includes(ext)
    })

    if (imageKeys.length === 0) return

    const urls: Record<string, string> = {}
    await Promise.all(
      imageKeys.map(async (key) => {
        try {
          const res = await fetch("/api/receipts/download-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          })
          if (res.ok) {
            const { data } = await res.json()
            urls[key] = data.downloadUrl
          }
        } catch {
          // ignore preview failures
        }
      }),
    )
    setPreviewUrls(urls)
  }, [files])

  useEffect(() => {
    fetchPreviewUrls()
  }, [fetchPreviewUrls])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)

      // 1. Get presigned URL
      const presignRes = await fetch("/api/receipts/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, contentType: file.type }),
      })

      if (!presignRes.ok) {
        const err = await presignRes.json()
        throw new Error(err.error || "Failed to get upload URL")
      }

      const { data } = await presignRes.json()

      // 2. Upload to R2
      const uploadRes = await fetch(data.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) throw new Error("Failed to upload file to storage")

      // 3. Save R2 key to transaction
      const updatedFiles = [...files, data.key]
      const patchRes = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: updatedFiles }),
      })

      if (!patchRes.ok) throw new Error("Failed to update transaction files")

      onFilesUpdate(updatedFiles)
      toast.success("File uploaded successfully")
    } catch (err) {
      logError("Upload error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to upload file")
    } finally {
      setIsUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveFile = async (fileKey: string) => {
    try {
      const updatedFiles = files.filter((f) => f !== fileKey)

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: updatedFiles }),
      })

      if (!response.ok) throw new Error("Failed to update transaction files")

      onFilesUpdate(updatedFiles)
      toast.success("File removed successfully")
    } catch (err) {
      logError("Error removing file:", err)
      toast.error("Failed to remove file")
    }
  }

  const handleViewFile = async (key: string) => {
    try {
      const res = await fetch("/api/receipts/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })

      if (!res.ok) throw new Error("Failed to get download URL")

      const { data } = await res.json()
      window.open(data.downloadUrl, "_blank")
    } catch (err) {
      logError("Error getting download URL:", err)
      toast.error("Failed to open file")
    }
  }

  const getFileType = (key: string): "image" | "pdf" | "document" => {
    const ext = key.split(".").pop()?.toLowerCase()
    if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return "image"
    if (ext === "pdf") return "pdf"
    return "document"
  }

  const getFileIcon = (fileType: "image" | "pdf" | "document") => {
    switch (fileType) {
      case "image":
        return <ImageIcon className="h-5 w-5" />
      case "pdf":
        return <FileText className="h-5 w-5" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const getFileName = (key: string): string => {
    const parts = key.split("/")
    return parts[parts.length - 1] || "Unknown file"
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-muted-foreground">Attached Receipts/Files</label>
        <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((fileKey, index) => {
            const fileType = getFileType(fileKey)
            const fileName = getFileName(fileKey)

            return (
              <Card key={index} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {fileType === "image" && previewUrls[fileKey] ? (
                      <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrls[fileKey]} alt={fileName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center text-primary">
                        {getFileIcon(fileType)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {fileType.toUpperCase()}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleRemoveFile(fileKey)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <button
                      onClick={() => handleViewFile(fileKey)}
                      className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View file <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
