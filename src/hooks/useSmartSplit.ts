"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { SuggestedSplit } from "@/lib/ai/smart-analyze-receipt"

interface SmartSplitState {
  isAnalyzing: boolean
  suggestedSplits: SuggestedSplit[]
  confidence: number | undefined
  notes: string | undefined
  error: string | null
  isModalOpen: boolean
  isConfirming: boolean
}

interface SmartSplitHandlers {
  confirmSplits: (transactionId: string, splits: SuggestedSplit[]) => Promise<void>
  cancelSplits: () => void
  setIsModalOpen: (isOpen: boolean) => void
}

export function useSmartSplit(): {
  state: SmartSplitState
  handlers: SmartSplitHandlers
} {
  const router = useRouter()
  const [state, setState] = useState<SmartSplitState>({
    isAnalyzing: false,
    suggestedSplits: [],
    confidence: undefined,
    notes: undefined,
    error: null,
    isModalOpen: false,
    isConfirming: false,
  })

  const confirmSplits = async (transactionId: string, splits: SuggestedSplit[]) => {
    setState((prev) => ({
      ...prev,
      isConfirming: true,
      error: null,
    }))

    try {
      const response = await fetch(`/api/transactions/${transactionId}/ai-split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ splits }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save splits")
      }

      // Success - refresh and close
      toast.success("Transaction split successfully!")
      router.refresh()

      setState((prev) => ({
        ...prev,
        isConfirming: false,
        isModalOpen: false,
        suggestedSplits: [],
        confidence: undefined,
        notes: undefined,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save splits"

      setState((prev) => ({
        ...prev,
        isConfirming: false,
        error: errorMessage,
      }))

      toast.error(errorMessage)
    }
  }

  const cancelSplits = () => {
    setState({
      isAnalyzing: false,
      suggestedSplits: [],
      confidence: undefined,
      notes: undefined,
      error: null,
      isModalOpen: false,
      isConfirming: false,
    })
  }

  const setIsModalOpen = (isOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      isModalOpen: isOpen,
    }))
  }

  return {
    state,
    handlers: {
      confirmSplits,
      cancelSplits,
      setIsModalOpen,
    },
  }
}
