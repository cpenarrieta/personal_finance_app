'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";

export function CategorizeButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const router = useRouter()

  const handleCategorize = async () => {
    if (isLoading) return

    setShowConfirmDialog(false)
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/categorize', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.message}`)
        // Refresh the page to show updated data
        setTimeout(() => {
          router.refresh()
          setMessage(null)
        }, 2000)
      } else {
        setMessage(`✗ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Categorization failed:', error)
      setMessage('✗ Categorization failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogTrigger asChild>
          <Button
            disabled={isLoading}
            className="px-6 py-3 bg-primary hover:bg-primary/90"
          >
            {isLoading ? '🤖 Categorizing...' : '🤖 Auto-Categorize Transactions'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-Categorize Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically categorize all transactions that don't have a category using AI. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCategorize} className="bg-primary hover:bg-primary/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {message && (
        <span className={`text-sm ${message.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
