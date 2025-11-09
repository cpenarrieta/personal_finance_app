import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ErrorFallbackProps } from "@/types";

/**
 * Inline error fallback component for Suspense boundaries
 * Shows a non-intrusive error message within the section that failed
 */
export function ErrorFallback({
  error,
  title = "Failed to load",
  description = "Unable to load this section. Try refreshing the page.",
}: ErrorFallbackProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || description}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Minimal error fallback for chart components
 */
export function ChartErrorFallback({ error }: { error?: Error }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-sm font-medium">Failed to load chart</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error?.message || "Unable to render chart data"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
