"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { SmartSplitReviewModal } from "@/components/transactions/modals/SmartSplitReviewModal"
import { analyzeReceiptAction, applySplitsAction } from "@/app/actions/analyze-receipt"
import { useRouter } from "next/navigation"
import type { CategoryForClient } from "@/types"
import type { SplitSuggestion } from "@/lib/ai/analyze-receipt"

interface AnalyzeReceiptButtonProps {
  transactionId: string
  transactionAmount: number
  hasFiles: boolean
  categories: CategoryForClient[]
}

export function AnalyzeReceiptButton({
  transactionId,
  transactionAmount,
  hasFiles,
  categories,
}: AnalyzeReceiptButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SplitSuggestion[]>([])
  const [reasoning, setReasoning] = useState<string>("")
  const router = useRouter()

  // Only render if transaction has files
  if (!hasFiles) {
    return null
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const result = await analyzeReceiptAction(transactionId)

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to analyze receipt")
        return
      }

      // Show success and open review modal
      toast.success("Receipt analyzed successfully!")
      setSuggestions(result.data.splits)
      setReasoning(result.data.reasoning)
      setIsReviewModalOpen(true)
    } catch (error) {
      console.error("Error analyzing receipt:", error)
      toast.error(error instanceof Error ? error.message : "Failed to analyze receipt")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConfirmSplits = async (
    splits: Array<{
      categoryName: string
      subcategoryName: string | null
      amount: number
      itemsSummary: string
    }>,
  ) => {
    const result = await applySplitsAction(transactionId, splits)

    if (!result.success) {
      throw new Error(result.error || "Failed to apply splits")
    }

    // Refresh the page to show new split transactions
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        variant="outline"
        className="border-primary text-primary hover:bg-primary/10"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing Receipt...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Split
          </>
        )}
      </Button>

      {/* Review Modal */}
      <SmartSplitReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        suggestions={suggestions}
        transactionTotal={Math.abs(transactionAmount)}
        categories={categories}
        onConfirm={handleConfirmSplits}
        reasoning={reasoning}
      />
    </>
  )
}
