"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Example page to test Sentry error monitoring
 * This page is created by the Sentry installation wizard
 */
export default function SentryExamplePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorSent, setErrorSent] = useState(false);

  const handleClientError = async () => {
    setIsLoading(true);
    setErrorSent(false);

    try {
      // Trigger a client-side error
      throw new Error("Sentry Frontend Error - Test from Example Page");
    } catch (error) {
      // Capture the error with Sentry
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);

      setErrorSent(true);
      console.error("Client error captured:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServerError = async () => {
    setIsLoading(true);
    setErrorSent(false);

    try {
      // Call an API route that will throw an error
      const response = await fetch("/api/sentry-example-api");

      if (!response.ok) {
        throw new Error("API request failed");
      }

      setErrorSent(true);
    } catch (error) {
      console.error("Server error triggered:", error);
      setErrorSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Sentry Example Page</CardTitle>
          <CardDescription>
            Test your Sentry integration by triggering example errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How to test Sentry</AlertTitle>
            <AlertDescription>
              Click the buttons below to generate test errors. These errors will be sent to your Sentry project
              where you can view them in the Issues or Traces sections.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Frontend Error</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Triggers a client-side error that will be captured by Sentry.
              </p>
              <Button
                onClick={handleClientError}
                disabled={isLoading}
                variant="destructive"
              >
                {isLoading ? "Throwing error..." : "Throw Frontend Error"}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Backend Error</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Triggers a server-side error via an API route that will be captured by Sentry.
              </p>
              <Button
                onClick={handleServerError}
                disabled={isLoading}
                variant="destructive"
              >
                {isLoading ? "Calling API..." : "Throw Backend Error"}
              </Button>
            </div>
          </div>

          {errorSent && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Error Sent!</AlertTitle>
              <AlertDescription>
                Check your Sentry project to see the error. It may take a few moments to appear.
                <br />
                <a
                  href="https://sentry.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline mt-2 inline-block"
                >
                  Go to Sentry Dashboard →
                </a>
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Errors in development mode are not sent to Sentry by default</li>
                <li>You can check the browser console to see error logs</li>
                <li>In production, all errors are automatically sent to Sentry</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="pt-4">
            <h3 className="text-sm font-semibold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Configure your Sentry DSN in environment variables</li>
              <li>Test error tracking in both development and production</li>
              <li>Set up performance monitoring and session replay</li>
              <li>Remove this example page when done testing</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
