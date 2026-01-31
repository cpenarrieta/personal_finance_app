"use client"

import { type KeyboardEvent, type ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { InlineEditableField } from "./InlineEditableField"
import { useInlineEdit } from "@/hooks/useInlineEdit"
import { cn } from "@/lib/utils"

interface InlineEditableInputProps {
  /** Transaction ID for API calls */
  transactionId: string
  /** Field name for API payload */
  fieldName: string
  /** Initial value */
  initialValue: string
  /** Placeholder text */
  placeholder?: string
  /** Custom class name for the container */
  className?: string
  /** Custom class name for read mode text */
  textClassName?: string
  /** Whether to refresh router after save */
  refreshOnSave?: boolean
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number
  /** Callback on successful save */
  onSuccess?: () => void
  /** Render custom read view */
  renderReadView?: (value: string) => React.ReactNode
}

export function InlineEditableInput({
  transactionId,
  fieldName,
  initialValue,
  placeholder = "Click to edit...",
  className,
  textClassName,
  refreshOnSave = false,
  debounceMs = 500,
  onSuccess,
  renderReadView,
}: InlineEditableInputProps) {
  const { value, isEditing, isSaving, isSaved, error, startEdit, cancelEdit, setValue, saveNow, inputRef } =
    useInlineEdit<string>(transactionId, initialValue, {
      fieldName,
      debounceMs,
      refreshOnSave,
      onSuccess,
    })

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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

  const defaultReadView = (
    <span className={cn("block py-1 px-2", textClassName)}>
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
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
      readView={renderReadView ? renderReadView(value) : defaultReadView}
      editView={
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isSaving}
          className="pr-8"
        />
      }
    />
  )
}
