"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Move transactions error:", error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <CardTitle>Failed to load move transactions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error.message || "Unable to fetch category data"}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button onClick={() => window.location.href = "/settings/manage-categories"} variant="outline">
            Manage categories
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
