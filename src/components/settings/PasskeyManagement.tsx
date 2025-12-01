"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth/auth-client"
import { Fingerprint, Smartphone, Trash2, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { logError } from "@/lib/utils/logger"

interface Passkey {
  id: string
  name: string | null
  deviceType: string
  createdAt: string
}

export default function PasskeyManagement() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [passkeyName, setPasskeyName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  // Load user's passkeys
  const loadPasskeys = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/passkeys/list")
      if (response.ok) {
        const data = await response.json()
        setPasskeys(data.passkeys || [])
      }
    } catch (error) {
      logError("Failed to load passkeys:", error)
      toast.error("Failed to load passkeys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPasskeys()
  }, [])

  // Add a new passkey
  const handleAddPasskey = async () => {
    try {
      setAdding(true)
      const deviceName = passkeyName || getDefaultDeviceName()

      const result = await authClient.passkey.addPasskey({
        name: deviceName,
      })

      if (result?.error) {
        toast.error(result.error.message || "Failed to add passkey")
        return
      }

      toast.success("Passkey added successfully! You can now use Face ID or Touch ID to sign in.")
      setPasskeyName("")
      setShowAddForm(false)
      await loadPasskeys()
    } catch (error: any) {
      logError("Failed to add passkey:", error)
      toast.error(error.message || "Failed to add passkey. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  // Delete a passkey
  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm("Are you sure you want to remove this passkey?")) {
      return
    }

    try {
      const response = await fetch(`/api/passkeys/${passkeyId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Passkey removed successfully")
        await loadPasskeys()
      } else {
        toast.error("Failed to remove passkey")
      }
    } catch (error) {
      logError("Failed to delete passkey:", error)
      toast.error("Failed to remove passkey")
    }
  }

  // Get default device name based on user agent
  const getDefaultDeviceName = () => {
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) return "iPhone"
    if (/iPad/.test(ua)) return "iPad"
    if (/Mac/.test(ua)) return "Mac"
    if (/Android/.test(ua)) return "Android Device"
    if (/Windows/.test(ua)) return "Windows Device"
    return "My Device"
  }

  // Check if passkeys are supported
  const isPasskeySupported = () => {
    return window.PublicKeyCredential && typeof window.PublicKeyCredential === "function"
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (!isPasskeySupported()) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Fingerprint className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Passkeys</h2>
        </div>
        <p className="text-muted-foreground">
          Passkeys are not supported in your current browser. Please use a modern browser like Chrome, Safari, or Edge.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Passkeys</h2>
            <p className="text-sm text-muted-foreground">Use Face ID, Touch ID, or other biometrics to sign in</p>
          </div>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Passkey
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="p-4 mb-4 bg-muted/50">
          <div className="space-y-4">
            <div>
              <Label htmlFor="passkey-name">Device Name (Optional)</Label>
              <Input
                id="passkey-name"
                value={passkeyName}
                onChange={(e) => setPasskeyName(e.target.value)}
                placeholder={getDefaultDeviceName()}
                disabled={adding}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Give this passkey a memorable name to identify it later
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddPasskey} disabled={adding}>
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Add Passkey
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false)
                  setPasskeyName("")
                }}
                variant="outline"
                disabled={adding}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {passkeys.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-2">No passkeys registered</p>
          <p className="text-sm text-muted-foreground">
            Add a passkey to enable Face ID, Touch ID, or other biometric sign-in on this device
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((passkey) => (
            <div key={passkey.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{passkey.name || "Unnamed Device"}</p>
                  <p className="text-sm text-muted-foreground">
                    Added on {new Date(passkey.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleDeletePasskey(passkey.id)}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium text-foreground mb-2">About Passkeys</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Passkeys are more secure than passwords</li>
          <li>• Use Face ID, Touch ID, or device PIN to sign in</li>
          <li>• Each passkey is unique to this device</li>
          <li>• You can add passkeys for multiple devices</li>
        </ul>
      </div>
    </Card>
  )
}
