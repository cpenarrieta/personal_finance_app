"use client"

import { type KeyboardEvent, type ChangeEvent } from "react"
import { Textarea } from "@/components/ui/textarea"
import { InlineEditableField } from "./InlineEditableField"
import { useInlineEdit } from "@/hooks/useInlineEdit"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"

interface InlineEditableTextareaProps {
  /** Transaction ID for API calls */
  transactionId: string
  /** Field name for API payload */
  fieldName: string
  /** Initial value */
  initialValue: string | null
  /** Placeholder text */
  placeholder?: string
  /** Custom class name for the container */
  className?: string
  /** Number of rows for textarea */
  rows?: number
  /** Whether to refresh router after save */
  refreshOnSave?: boolean
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number
  /** Callback on successful save */
  onSuccess?: () => void
}

export function InlineEditableTextarea({
  transactionId,
  fieldName,
  initialValue,
  placeholder = "Add notes...",
  className,
  rows = 3,
  refreshOnSave = false,
  debounceMs = 500,
  onSuccess,
}: InlineEditableTextareaProps) {
  const { value, isEditing, isSaving, isSaved, error, startEdit, cancelEdit, setValue, saveNow, inputRef } =
    useInlineEdit<string | null>(transactionId, initialValue, {
      fieldName,
      debounceMs,
      refreshOnSave,
      onSuccess,
    })

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to save and close
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      saveNow().then(() => {
        cancelEdit()
      })
    }
  }

  const handleBlur = () => {
    // Save on blur, then exit edit mode
    saveNow().then((success) => {
      if (success) {
        cancelEdit()
      }
    })
  }

  const readView = value ? (
    <p className="text-sm whitespace-pre-wrap py-1 px-2">{value}</p>
  ) : (
    <div className="flex items-center gap-1.5 py-1 px-2 text-sm text-muted-foreground">
      <Plus className="h-3.5 w-3.5" />
      <span>{placeholder}</span>
    </div>
  )

  return (
    <InlineEditableField
      isEditing={isEditing}
      isSaving={isSaving}
      isSaved={isSaved}
      error={error}
      onStartEdit={startEdit}
      onCancel={cancelEdit}
      className={className}
      showPencil={!!value}
      readView={readView}
      editView={
        <div className="relative">
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value || ""}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value || null)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isSaving}
            rows={rows}
            className={cn("pr-8 resize-none")}
          />
          <p className="text-xs text-muted-foreground mt-1">Press Escape to cancel, Cmd+Enter to save</p>
        </div>
      }
    />
  )
}
