"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, FileText, Image as ImageIcon, File } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface TransactionFileUploadProps {
  transactionId: string
  files: string[]
  onFilesUpdate: (files: string[]) => void
}

export function TransactionFileUpload({ transactionId, files, onFilesUpdate }: TransactionFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = async () => {
    try {
      setIsUploading(true)
      setUploadError(null)

      // Check if Cloudinary is configured
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
        )
      }

      // Create a Cloudinary upload widget
      const widget = (window as any).cloudinary?.createUploadWidget(
        {
          cloudName,
          uploadPreset,
          sources: ["local", "url", "camera"],
          multiple: false,
          maxFiles: 1,
          clientAllowedFormats: ["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx", "webp"],
          maxFileSize: 10000000, // 10MB
          publicIdPrefix: `personal-finance/${transactionId}`,
          tags: [transactionId, "transaction-file"],
        },
        async (error: any, result: any) => {
          if (error) {
            console.error("Upload error:", error)
            setUploadError(error.message || "Failed to upload file")
            toast.error("Failed to upload file")
            setIsUploading(false)
            return
          }

          if (result.event === "success") {
            const newFileUrl = result.info.secure_url
            const updatedFiles = [...files, newFileUrl]

            // Update transaction files in the backend
            try {
              const response = await fetch(`/api/transactions/${transactionId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  files: updatedFiles,
                }),
              })

              if (!response.ok) {
                throw new Error("Failed to update transaction files")
              }

              onFilesUpdate(updatedFiles)
              toast.success("File uploaded successfully")
            } catch (err) {
              console.error("Error updating transaction:", err)
              toast.error("Failed to save file to transaction")
            }
          }

          if (result.event === "close") {
            setIsUploading(false)
          }
        },
      )

      widget?.open()
    } catch (err) {
      console.error("Error opening upload widget:", err)
      setUploadError(err instanceof Error ? err.message : "Failed to open upload widget")
      toast.error("Failed to open upload widget")
      setIsUploading(false)
    }
  }

  const handleRemoveFile = async (fileUrl: string) => {
    try {
      const updatedFiles = files.filter((f) => f !== fileUrl)

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: updatedFiles,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update transaction files")
      }

      onFilesUpdate(updatedFiles)
      toast.success("File removed successfully")
    } catch (err) {
      console.error("Error removing file:", err)
      toast.error("Failed to remove file")
    }
  }

  const getFileType = (url: string): "image" | "pdf" | "document" => {
    const lower = url.toLowerCase()
    if (lower.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image"
    if (lower.includes(".pdf")) return "pdf"
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

  const getFileName = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const parts = pathname.split("/")
      const lastPart = parts[parts.length - 1]
      return lastPart ? decodeURIComponent(lastPart) : "Unknown file"
    } catch {
      return "Unknown file"
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-muted-foreground">Attached Files</label>
        <Button onClick={handleUpload} disabled={isUploading} size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>

      {uploadError && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((fileUrl, index) => {
            const fileType = getFileType(fileUrl)
            const fileName = getFileName(fileUrl)

            return (
              <Card key={index} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {fileType === "image" ? (
                      <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                        <Image src={fileUrl} alt={fileName} fill className="object-cover" sizes="64px" />
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
                        onClick={() => handleRemoveFile(fileUrl)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      View file
                    </a>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Note about Cloudinary setup */}
      {!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
        <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning-foreground">
          <p className="font-medium">Cloudinary not configured</p>
          <p className="text-xs mt-1">
            Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables to
            enable file uploads.
          </p>
        </div>
      )}
    </div>
  )
}
