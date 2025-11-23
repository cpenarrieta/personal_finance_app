"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { smartAnalyzeReceiptAction } from "@/app/actions/smart-analyze-receipt-action"
import { toast } from "sonner"
import type { SmartAnalysisResult, SuggestedSplit } from "@/lib/ai/smart-analyze-receipt"

interface SmartAnalysisState {
  isAnalyzing: boolean
  resultType: "split" | "recategorize" | "confirm" | null

  // For split results
  suggestedSplits: SuggestedSplit[]
  splitConfidence: number | undefined
  splitNotes: string | undefined
  isSplitModalOpen: boolean
  isConfirmingSplit: boolean

  // For recategorize results
  suggestedCategoryId: string | null
  suggestedSubcategoryId: string | null
  suggestedCategoryName: string | null
  suggestedSubcategoryName: string | null
  recategorizeConfidence: number | undefined
  recategorizeReasoning: string | undefined
  isRecategorizeDialogOpen: boolean
  isApplyingRecategorization: boolean

  error: string | null
}

interface SmartAnalysisHandlers {
  analyzeReceipt: (transactionId: string, categories: any[]) => Promise<void>
  confirmSplit: (transactionId: string, splits: SuggestedSplit[]) => Promise<void>
  applyRecategorization: (transactionId: string, categoryId: string, subcategoryId: string | null) => Promise<void>
  cancelSplit: () => void
  cancelRecategorization: () => void
  reset: () => void
}

const initialState: SmartAnalysisState = {
  isAnalyzing: false,
  resultType: null,
  suggestedSplits: [],
  splitConfidence: undefined,
  splitNotes: undefined,
  isSplitModalOpen: false,
  isConfirmingSplit: false,
  suggestedCategoryId: null,
  suggestedSubcategoryId: null,
  suggestedCategoryName: null,
  suggestedSubcategoryName: null,
  recategorizeConfidence: undefined,
  recategorizeReasoning: undefined,
  isRecategorizeDialogOpen: false,
  isApplyingRecategorization: false,
  error: null,
}

export function useSmartAnalysis(): {
  state: SmartAnalysisState
  handlers: SmartAnalysisHandlers
} {
  const router = useRouter()
  const [state, setState] = useState<SmartAnalysisState>(initialState)

  const analyzeReceipt = async (transactionId: string, categories: any[]) => {
    setState((prev) => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      resultType: null,
    }))

    try {
      const result: SmartAnalysisResult | null = await smartAnalyzeReceiptAction(transactionId)

      if (!result) {
        throw new Error("Failed to analyze receipt. Please ensure the file is a valid receipt image or PDF.")
      }

      // Handle different result types
      if (result.type === "split") {
        if (result.splits.length < 2) {
          throw new Error("Analysis returned invalid split suggestion (less than 2 categories).")
        }

        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          resultType: "split",
          suggestedSplits: result.splits,
          splitConfidence: result.confidence,
          splitNotes: result.notes,
          isSplitModalOpen: true,
          error: null,
        }))

        toast.success(`Receipt analyzed! Found ${result.splits.length} categories to split.`)
      } else if (result.type === "recategorize") {
        // Get category names from the categories array
        const category = categories.find((c) => c.id === result.categoryId)
        const subcategory = result.subcategoryId
          ? category?.subcategories?.find((s: any) => s.id === result.subcategoryId)
          : null

        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          resultType: "recategorize",
          suggestedCategoryId: result.categoryId,
          suggestedSubcategoryId: result.subcategoryId,
          suggestedCategoryName: category?.name || null,
          suggestedSubcategoryName: subcategory?.name || null,
          recategorizeConfidence: result.confidence,
          recategorizeReasoning: result.reasoning,
          isRecategorizeDialogOpen: true,
          error: null,
        }))

        toast.success("Better category found! Review the suggestion.")
      } else {
        // Type: confirm
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          resultType: "confirm",
          error: null,
        }))

        toast.success(result.message || "Current category confirmed as appropriate! ✓", {
          duration: 4000,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze receipt"

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
      }))

      toast.error(errorMessage)
    }
  }

  const confirmSplit = async (transactionId: string, splits: SuggestedSplit[]) => {
    setState((prev) => ({
      ...prev,
      isConfirmingSplit: true,
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
        ...initialState,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save splits"

      setState((prev) => ({
        ...prev,
        isConfirmingSplit: false,
        error: errorMessage,
      }))

      toast.error(errorMessage)
    }
  }

  const applyRecategorization = async (transactionId: string, categoryId: string, subcategoryId: string | null) => {
    setState((prev) => ({
      ...prev,
      isApplyingRecategorization: true,
      error: null,
    }))

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          subcategoryId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      // Success - refresh and close
      toast.success("Transaction recategorized successfully!")
      router.refresh()

      setState((prev) => ({
        ...prev,
        ...initialState,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update category"

      setState((prev) => ({
        ...prev,
        isApplyingRecategorization: false,
        error: errorMessage,
      }))

      toast.error(errorMessage)
    }
  }

  const cancelSplit = () => {
    setState((prev) => ({
      ...prev,
      isSplitModalOpen: false,
      suggestedSplits: [],
      splitConfidence: undefined,
      splitNotes: undefined,
    }))
  }

  const cancelRecategorization = () => {
    setState((prev) => ({
      ...prev,
      isRecategorizeDialogOpen: false,
      suggestedCategoryId: null,
      suggestedSubcategoryId: null,
      suggestedCategoryName: null,
      suggestedSubcategoryName: null,
      recategorizeConfidence: undefined,
      recategorizeReasoning: undefined,
    }))
  }

  const reset = () => {
    setState(initialState)
  }

  return {
    state,
    handlers: {
      analyzeReceipt,
      confirmSplit,
      applyRecategorization,
      cancelSplit,
      cancelRecategorization,
      reset,
    },
  }
}
