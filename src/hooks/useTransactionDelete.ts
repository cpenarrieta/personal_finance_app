import { useState } from "react"
import { useRouter } from "next/navigation"

export function useTransactionDelete(transactionId: string) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const deleteTransaction = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete transaction")
      }

      // Redirect to transactions page after successful deletion
      router.push("/transactions")
      router.refresh()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      alert("Failed to delete transaction. Please try again.")
      setIsDeleting(false)
      setIsDialogOpen(false)
    }
  }

  return {
    state: {
      isDeleting,
      isDialogOpen,
    },
    handlers: {
      deleteTransaction,
      setIsDialogOpen,
    },
  }
}
