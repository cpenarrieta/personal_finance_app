"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface UncategorizedBannerProps {
  count: number
}

export function UncategorizedBanner({ count }: UncategorizedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem("uncategorized-banner-dismissed")
    if (dismissed === "true") {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem("uncategorized-banner-dismissed", "true")
  }

  // Don't show if no uncategorized transactions or if dismissed
  if (count === 0 || isDismissed) {
    return null
  }

  return (
    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="flex items-center justify-between">
        <span>Uncategorized Transactions</span>
        <Button variant="ghost" size="icon" className="h-5 w-5 -mr-2" onClick={handleDismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You have {count} transaction{count !== 1 ? "s" : ""} that need categorization
        </span>
        <Button asChild size="sm" variant="outline" className="ml-4">
          <Link href="/transactions?showIncome=true&showExpenses=true&uncategorized=true">Categorize Now</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
