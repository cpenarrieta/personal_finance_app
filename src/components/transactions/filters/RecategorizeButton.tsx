"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function RecategorizeButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const router = useRouter()

  const handleRecategorize = async () => {
    if (isLoading) return

    setShowConfirmDialog(false)
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/categorize-all", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.message}`)
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
          setMessage(null)
        }, 3000)
      } else {
        setMessage(`✗ Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Categorization failed:", error)
      setMessage("✗ Categorization failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogTrigger asChild>
          <Button disabled={isLoading} className="px-6 py-3 bg-orange-600 hover:bg-orange-700">
            {isLoading ? "🔄 Re-categorizing All..." : "🔄 Re-Categorize All (Overwrite)"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ WARNING: Re-categorize All Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-categorize ALL transactions using AI, overwriting any existing categories you have set
              manually. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecategorize} className="bg-orange-600 hover:bg-orange-700">
              Confirm Re-categorize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {message && (
        <span className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{message}</span>
      )}
    </div>
  )
}
