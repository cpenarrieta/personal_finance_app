"use client"

import { type ReactNode } from "react"
import { InlineEditableField } from "./InlineEditableField"
import { useInlineEdit } from "@/hooks/useInlineEdit"
import { cn } from "@/lib/utils"

interface InlineEditableSelectProps {
  /** Transaction ID for API calls */
  transactionId: string
  /** Field name for API payload */
  fieldName: string
  /** Initial value */
  initialValue: string | null
  /** Placeholder text when no value */
  placeholder?: string
  /** Custom class name for the container */
  className?: string
  /** Whether to refresh router after save */
  refreshOnSave?: boolean
  /** Callback on successful save */
  onSuccess?: () => void
  /** Callback when value changes (for cascading selects) */
  onValueChange?: (value: string | null) => void
  /** Render the select element */
  renderSelect: (props: {
    value: string
    onChange: (value: string) => void
    disabled: boolean
    className: string
  }) => ReactNode
  /** Render custom read view */
  renderReadView?: (value: string | null) => ReactNode
  /** Display text for current value (used in default read view) */
  displayValue?: string | null
}

export function InlineEditableSelect({
  transactionId,
  fieldName,
  initialValue,
  placeholder = "Select...",
  className,
  refreshOnSave = true,
  onSuccess,
  onValueChange,
  renderSelect,
  renderReadView,
  displayValue,
}: InlineEditableSelectProps) {
  const { value, isEditing, isSaving, isSaved, error, startEdit, cancelEdit, setValue, saveNow } = useInlineEdit<
    string | null
  >(transactionId, initialValue, {
    fieldName,
    debounceMs: 0, // Immediate save for selects
    refreshOnSave,
    onSuccess,
  })

  const handleChange = async (newValue: string) => {
    const valueToSet = newValue === "" ? null : newValue
    setValue(valueToSet)
    onValueChange?.(valueToSet)

    // Immediate save for selects
    const success = await saveNow()
    if (success) {
      cancelEdit()
    }
  }

  const defaultReadView = (
    <div className="py-1 px-2">
      {displayValue || value ? (
        <span>{displayValue || value}</span>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
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
      readView={renderReadView ? renderReadView(value) : defaultReadView}
      editView={renderSelect({
        value: value || "",
        onChange: handleChange,
        disabled: isSaving,
        className: cn(
          "w-full px-3 py-2 border border-input rounded-md",
          "focus:ring-2 focus:ring-ring focus:border-ring",
          "bg-background text-foreground",
        ),
      })}
    />
  )
}
