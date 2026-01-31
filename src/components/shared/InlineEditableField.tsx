"use client"

import { useRef, useEffect, type ReactNode, type KeyboardEvent } from "react"
import { Pencil, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useClickOutside } from "@/hooks/useClickOutside"

interface InlineEditableFieldProps {
  /** Whether field is in edit mode */
  isEditing: boolean
  /** Whether save is in progress */
  isSaving: boolean
  /** Whether save just completed */
  isSaved: boolean
  /** Error message if save failed */
  error?: string | null
  /** Enter edit mode */
  onStartEdit: () => void
  /** Cancel edit mode */
  onCancel: () => void
  /** Content to show in read mode */
  readView: ReactNode
  /** Content to show in edit mode */
  editView: ReactNode
  /** Additional class name */
  className?: string
  /** Whether to show pencil icon on hover (default: true) */
  showPencil?: boolean
  /** Whether this field is read-only (no edit capability) */
  readOnly?: boolean
}

export function InlineEditableField({
  isEditing,
  isSaving,
  isSaved,
  error,
  onStartEdit,
  onCancel,
  readView,
  editView,
  className,
  showPencil = true,
  readOnly = false,
}: InlineEditableFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Cancel on click outside when editing
  useClickOutside(
    containerRef as React.RefObject<HTMLDivElement>,
    () => {
      if (isEditing && !isSaving) {
        // Don't cancel, let blur handle the save
      }
    },
    isEditing,
  )

  // Handle escape key
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isEditing, onCancel])

  if (readOnly) {
    return <div className={className}>{readView}</div>
  }

  if (isEditing) {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        {editView}
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={onStartEdit}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onStartEdit()
        }
      }}
      role="button"
      tabIndex={0}
      className={cn("group relative cursor-pointer rounded-md transition-colors", "hover:bg-muted/50", className)}
    >
      {readView}
      {showPencil && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isSaved ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      )}
      {isSaved && !showPencil && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Check className="h-4 w-4 text-success" />
        </div>
      )}
    </div>
  )
}
