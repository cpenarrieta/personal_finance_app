import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginButtons } from "@/components/LoginButtons";
import { Skeleton } from "@/components/ui/skeleton";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <>
      {error === "unauthorized" && (
        <Alert variant="destructive" className="w-full">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Your email is not authorized to access this application.
          </AlertDescription>
        </Alert>
      )}
      <LoginButtons />
      <p className="text-sm text-muted-foreground text-center mt-4">
        This app is restricted to authorized users only.
      </p>
    </>
  );
}

function LoginContentSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-3/4 mx-auto" />
    </div>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Personal Finance
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to access your financial dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 pt-6">
          <Suspense fallback={<LoginContentSkeleton />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
