import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginButtons } from "@/components/LoginButtons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
