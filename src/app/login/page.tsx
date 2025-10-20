import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm text-center">
              <p className="font-semibold">Access Denied</p>
              <p className="mt-1">
                Your email is not authorized to access this application.
              </p>
            </div>
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
