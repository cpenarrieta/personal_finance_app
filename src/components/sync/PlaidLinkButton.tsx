"use client"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react"
import { logError } from "@/lib/utils/logger"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PlaidLinkButtonProps {
  buttonText?: string
  onReauthSuccess?: () => void
  itemId?: string // Database item ID for update mode
}

export default function PlaidLinkButton({
  buttonText = "Connect Account",
  onReauthSuccess,
  itemId,
}: PlaidLinkButtonProps) {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Reconnection warning state
  const [showReconnectionWarning, setShowReconnectionWarning] = useState(false)
  const [reconnectionData, setReconnectionData] = useState<{
    reconnectionId: string
    transactionCount: number
    institutionName: string
  } | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const isUpdateMode = !!itemId

  useEffect(() => {
    // For update mode, send item_id so the server can look up the access token securely
    const body = itemId ? JSON.stringify({ item_id: itemId }) : undefined
    fetch("/api/plaid/create-link-token", {
      method: "POST",
      headers: itemId ? { "Content-Type": "application/json" } : undefined,
      body,
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          throw new Error(data.error || "Failed to create link token")
        }
        return data
      })
      .then((d) => setLinkToken(d.data.link_token))
      .catch((err) => {
        logError("Error creating link token:", err)
        setError(err.message)
      })
  }, [itemId])

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncError(null)
    try {
      const response = await fetch("/api/plaid/sync", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Sync failed")
      }

      // Success - close dialog and refresh
      setShowSyncDialog(false)
      router.refresh()
    } catch (err: any) {
      setSyncError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCompleteReconnection = async () => {
    if (!reconnectionData) return

    setIsCompleting(true)
    setSyncError(null)

    try {
      const response = await fetch("/api/plaid/complete-reconnection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconnectionId: reconnectionData.reconnectionId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Reconnection failed")
      }

      // Success - close warning dialog
      setShowReconnectionWarning(false)
      setReconnectionData(null)

      // Show sync dialog for new connections
      if (!isUpdateMode) {
        setShowSyncDialog(true)
      } else {
        // For update mode, just show success and call callback
        onReauthSuccess?.()
      }

      // Refresh to get updated data
      router.refresh()
    } catch (err: any) {
      setSyncError(err.message)
    } finally {
      setIsCompleting(false)
    }
  }

  const onSuccess = useCallback(
    async (public_token: string) => {
      try {
        if (isUpdateMode && itemId) {
          // Update mode: Use prepare-exchange to detect reauth vs reconnection
          const response = await fetch("/api/plaid/prepare-exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token, existingItemDbId: itemId }),
          })

          const data = await response.json()

          if (!response.ok || !data.success) {
            throw new Error(data.error || "Failed to process update")
          }

          const result = data.data
          if (result.type === "reauth") {
            // Simple reauth - update status to ACTIVE
            await fetch("/api/plaid/update-item-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId }),
            })
            onReauthSuccess?.()
            router.refresh()
          } else if (result.type === "reconnection") {
            // Reconnection - show warning before deleting transactions
            setReconnectionData({
              reconnectionId: result.reconnectionId,
              transactionCount: result.transactionCount,
              institutionName: result.institutionName,
            })
            setShowReconnectionWarning(true)
          }
        } else {
          // New connection: Use existing exchange-public-token flow
          await fetch("/api/plaid/exchange-public-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token }),
          })

          // Show sync dialog
          setShowSyncDialog(true)
          router.refresh()
        }
      } catch (err: any) {
        logError("Error in onSuccess:", err)
        setError(err.message || "Failed to connect account")
      }
    },
    [isUpdateMode, itemId, onReauthSuccess, router],
  )

  const { open, ready } = usePlaidLink(linkToken ? { token: linkToken, onSuccess } : { token: "", onSuccess })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Button disabled={!ready} onClick={() => open?.()} variant={isUpdateMode ? "outline" : "default"}>
        {ready ? buttonText : "Loading…"}
      </Button>

      {/* Reconnection Warning Dialog */}
      <Dialog open={showReconnectionWarning} onOpenChange={setShowReconnectionWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reconnection Detected
            </DialogTitle>
            <DialogDescription>
              {reconnectionData && (
                <>
                  You've reconnected to <strong>{reconnectionData.institutionName}</strong> with a new item. This will
                  delete <strong>{reconnectionData.transactionCount} existing transactions</strong> and re-sync them
                  from Plaid.
                  <br />
                  <br />
                  Split transactions and user customizations will be preserved.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {syncError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReconnectionWarning(false)
                setReconnectionData(null)
              }}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCompleteReconnection} disabled={isCompleting}>
              {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCompleting ? "Reconnecting..." : "Continue & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Dialog (for new connections) */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Linked Successfully!</DialogTitle>
            <DialogDescription>
              Your account has been linked. Would you like to sync your financial data now?
            </DialogDescription>
          </DialogHeader>

          {syncError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)} disabled={isSyncing}>
              Skip
            </Button>
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
