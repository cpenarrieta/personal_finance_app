"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function SecurityErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your passkeys and biometric authentication.</p>
      </div>
      <div className="flex flex-col items-center justify-center p-8 border border-destructive rounded-lg bg-destructive/10">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4 text-center">{error.message}</p>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  )
}
