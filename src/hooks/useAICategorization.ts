import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAICategorization,
  applyAICategorization,
  type AICategorizeResponse,
} from "@/app/(app)/transactions/[id]/actions"

export function useAICategorization(transactionId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<AICategorizeResponse | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const categorize = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAICategorization(transactionId)

      if (!result.success || !result.data) {
        setError(result.error || "Failed to get AI categorization")
        return
      }

      setSuggestion(result.data)
      setIsDialogOpen(true)
    } catch (error) {
      console.error("Error getting AI categorization:", error)
      setError(error instanceof Error ? error.message : "Failed to get AI categorization")
    } finally {
      setIsLoading(false)
    }
  }

  const apply = async () => {
    if (!suggestion || !suggestion.categoryId) {
      return
    }

    setIsApplying(true)
    try {
      const result = await applyAICategorization(transactionId, suggestion.categoryId, suggestion.subcategoryId)

      if (!result.success) {
        setError(result.error || "Failed to apply AI categorization")
        return
      }

      // Close dialog and refresh
      setIsDialogOpen(false)
      setSuggestion(null)
      router.refresh()
    } catch (error) {
      console.error("Error applying AI categorization:", error)
      setError(error instanceof Error ? error.message : "Failed to apply AI categorization")
    } finally {
      setIsApplying(false)
    }
  }

  const deny = () => {
    setIsDialogOpen(false)
    setSuggestion(null)
    setError(null)
  }

  return {
    state: {
      isLoading,
      suggestion,
      isDialogOpen,
      isApplying,
      error,
    },
    handlers: {
      categorize,
      apply,
      deny,
      setIsDialogOpen,
    },
  }
}
