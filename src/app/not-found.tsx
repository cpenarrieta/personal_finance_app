import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

/**
 * Root-level not-found page
 * Shown when a page is not found (404)
 * Per Next.js best practices for error handling
 */
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            <FileQuestion className="h-16 w-16 text-muted-foreground" />
            <CardTitle className="text-2xl text-center">Page Not Found</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/transactions">View Transactions</Link>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mt-4">
            <p>Common pages:</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/accounts" className="text-primary hover:underline">
                  Accounts
                </Link>
              </li>
              <li>
                <Link href="/investments/holdings" className="text-primary hover:underline">
                  Investments
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-primary hover:underline">
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
