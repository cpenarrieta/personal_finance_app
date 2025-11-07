'use client'

import { useState } from 'react'
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

export function DeleteButton({
  id,
  action,
  confirmMessage,
  buttonText = 'Delete',
  className = 'text-destructive hover:text-destructive/80 text-sm',
}: {
  id: string
  action: (formData: FormData) => Promise<void>
  confirmMessage: string
  buttonText?: string
  className?: string
}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    const formData = new FormData()
    formData.append('id', id)
    action(formData)
  }

  return (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          {buttonText}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

