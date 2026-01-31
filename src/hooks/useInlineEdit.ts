"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDebounce } from "./useDebounce"

interface UseInlineEditOptions {
  /** Debounce delay for auto-save (default: 500ms, 0 for immediate) */
  debounceMs?: number
  /** Field name for API payload */
  fieldName: string
  /** Callback after successful save */
  onSuccess?: () => void
  /** Whether to refresh router after save */
  refreshOnSave?: boolean
}

interface UseInlineEditReturn<T> {
  /** Current value (may be uncommitted) */
  value: T
  /** Whether currently in edit mode */
  isEditing: boolean
  /** Whether save is in progress */
  isSaving: boolean
  /** Whether save just completed successfully */
  isSaved: boolean
  /** Error message if save failed */
  error: string | null
  /** Enter edit mode */
  startEdit: () => void
  /** Cancel edit and revert to original value */
  cancelEdit: () => void
  /** Update value (triggers auto-save after debounce) */
  setValue: (value: T) => void
  /** Force immediate save */
  saveNow: () => Promise<boolean>
  /** Input ref for focus management */
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>
}

export function useInlineEdit<T>(
  transactionId: string,
  initialValue: T,
  options: UseInlineEditOptions,
): UseInlineEditReturn<T> {
  const { debounceMs = 500, fieldName, onSuccess, refreshOnSave = false } = options
  const router = useRouter()

  const [value, setValueState] = useState<T>(initialValue)
  const [originalValue, setOriginalValue] = useState<T>(initialValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  const debouncedValue = useDebounce(value, debounceMs)
  const pendingSaveRef = useRef(false)
  const lastSavedValueRef = useRef<T>(initialValue)
  const isEditingRef = useRef(false)
  const isAutoSavingRef = useRef(false)

  // Keep ref in sync with state for use in effects
  useEffect(() => {
    isEditingRef.current = isEditing
  }, [isEditing])

  // Reset state when initialValue changes (e.g., after router refresh)
  // But only if we're not currently editing to avoid losing user input/focus
  useEffect(() => {
    if (!isEditingRef.current) {
      setValueState(initialValue)
      setOriginalValue(initialValue)
      lastSavedValueRef.current = initialValue
    }
  }, [initialValue])

  const save = useCallback(
    async (valueToSave: T): Promise<boolean> => {
      // Skip if value hasn't changed from last saved
      if (JSON.stringify(valueToSave) === JSON.stringify(lastSavedValueRef.current)) {
        return true
      }

      setIsSaving(true)
      setError(null)
      pendingSaveRef.current = false

      try {
        const payload: Record<string, unknown> = {
          [fieldName]: valueToSave,
        }

        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error("Failed to save")
        }

        lastSavedValueRef.current = valueToSave
        setOriginalValue(valueToSave)
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 1500)

        if (refreshOnSave) {
          router.refresh()
        }

        onSuccess?.()
        return true
      } catch {
        setError("Failed to save")
        toast.error("Failed to save changes")
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [transactionId, fieldName, refreshOnSave, router, onSuccess],
  )

  // Auto-save when debounced value changes (only in edit mode)
  useEffect(() => {
    if (isEditing && pendingSaveRef.current) {
      isAutoSavingRef.current = true
      save(debouncedValue).finally(() => {
        isAutoSavingRef.current = false
      })
    }
  }, [debouncedValue, isEditing, save])

  const startEdit = useCallback(() => {
    setIsEditing(true)
    setError(null)
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setValueState(originalValue)
    setError(null)
    pendingSaveRef.current = false
  }, [originalValue])

  const setValue = useCallback((newValue: T) => {
    setValueState(newValue)
    pendingSaveRef.current = true
  }, [])

  const saveNow = useCallback(async (): Promise<boolean> => {
    return save(value)
  }, [save, value])

  return {
    value,
    isEditing,
    isSaving,
    isSaved,
    error,
    startEdit,
    cancelEdit,
    setValue,
    saveNow,
    inputRef,
  }
}
