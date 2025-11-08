"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
      alert("Linked! Now run a sync.");
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
    <Button
      disabled={!ready}
      onClick={() => open?.()}
      variant={isUpdateMode ? "outline" : "default"}
    >
      {ready ? buttonText : "Loading…"}
    </Button>
  );
}
