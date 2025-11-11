"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
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
} from "@/components/ui/alert-dialog"

interface GenericSyncButtonProps {
  action: () => Promise<void>
  idleText: string
  pendingText: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
  requireConfirmation?: boolean
  confirmationTitle?: string
  confirmationDescription?: string
}

function SubmitButton({
  idleText,
  pendingText,
  variant = "outline",
  className = "",
}: Pick<GenericSyncButtonProps, "idleText" | "pendingText" | "variant" | "className">) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {pending ? pendingText : idleText}
    </Button>
  )
}

export function GenericSyncButton({
  action,
  idleText,
  pendingText,
  variant = "outline",
  className = "",
  requireConfirmation = false,
  confirmationTitle = "Confirm Action",
  confirmationDescription = "Are you sure you want to continue?",
}: GenericSyncButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    if (requireConfirmation) {
      e.preventDefault()
      setShowConfirmation(true)
    }
  }

  const handleConfirm = () => {
    setShowConfirmation(false)
    action()
  }

  return (
    <>
      <form onSubmit={handleSubmit} action={requireConfirmation ? undefined : action}>
        <SubmitButton idleText={idleText} pendingText={pendingText} variant={variant} className={className} />
      </form>

      {requireConfirmation && (
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmationTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmationDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} className="bg-orange-500 hover:bg-orange-600">
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
