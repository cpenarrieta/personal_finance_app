"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlaidLinkButtonProps {
  accessToken?: string;
  buttonText?: string;
  onReauthSuccess?: () => void;
}

export default function PlaidLinkButton({
  accessToken,
  buttonText = "Connect Account",
  onReauthSuccess
}: PlaidLinkButtonProps) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isUpdateMode = !!accessToken;

  useEffect(() => {
    const body = accessToken ? JSON.stringify({ access_token: accessToken }) : undefined;
    fetch("/api/plaid/create-link-token", {
      method: "POST",
      headers: accessToken ? { "Content-Type": "application/json" } : undefined,
      body,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data.error || "Failed to create link token");
        }
        return data;
      })
      .then((d) => setLinkToken(d.link_token))
      .catch((err) => {
        console.error("Error creating link token:", err);
        setError(err.message);
      });
  }, [accessToken]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/plaid/sync", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Sync failed");
      }

      // Success - close dialog and refresh
      setShowSyncDialog(false);
      router.refresh();
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const onSuccess = useCallback(async (public_token: string) => {
    // Both new and update mode require token exchange
    await fetch("/api/plaid/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_token }),
    });

    if (isUpdateMode) {
      alert("Reauthorized! Syncing should work now.");
      onReauthSuccess?.();
    } else {
      setShowSyncDialog(true);
    }

    // Refresh to get updated data from server
    router.refresh();
  }, [isUpdateMode, onReauthSuccess, router]);

  const { open, ready } = usePlaidLink(
    linkToken ? { token: linkToken, onSuccess } : { token: "", onSuccess }
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button
        disabled={!ready}
        onClick={() => open?.()}
        variant={isUpdateMode ? "outline" : "default"}
      >
        {ready ? buttonText : "Loading…"}
      </Button>

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
            <Button
              variant="outline"
              onClick={() => setShowSyncDialog(false)}
              disabled={isSyncing}
            >
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
  );
}
