"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { refreshSpendingSummary } from "@/app/(app)/actions"
import { toast } from "sonner"

interface RefreshSummaryButtonProps {
  monthsBack: number
}

export function RefreshSummaryButton({ monthsBack }: RefreshSummaryButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)

    startTransition(async () => {
      try {
        const result = await refreshSpendingSummary(monthsBack)

        if (result.success) {
          toast.success("Spending insights refreshed")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to refresh insights")
        }
      } catch {
        toast.error("An error occurred while refreshing")
      } finally {
        setIsRefreshing(false)
      }
    })
  }

  const isLoading = isPending || isRefreshing

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isLoading}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Refreshing..." : "Refresh"}
    </Button>
  )
}
