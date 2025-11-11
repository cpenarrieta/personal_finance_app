import PlaidLinkButton from "@/components/sync/PlaidLinkButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Info } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { getAllConnectedItems } from "@/lib/db/queries"

export const metadata: Metadata = {
  title: "Connect Account",
  robots: {
    index: false,
    follow: false,
  },
}

type ConnectedItem = Awaited<ReturnType<typeof getAllConnectedItems>>[number]

export default async function ConnectAccountPage() {
  const items = await getAllConnectedItems()
  const hasExistingConnections = items.length > 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Connect Account</h1>
        <p className="text-muted-foreground mt-1">Connect your bank account to sync your financial data.</p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Only for connecting new accounts. To reauthenticate, go to{" "}
          <Link href="/settings/connections" className="underline font-medium">
            Settings → Connections
          </Link>
          .
        </AlertDescription>
      </Alert>

      {hasExistingConnections && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Already Connected Banks</AlertTitle>
          <AlertDescription>
            <p className="mb-2">You already have the following banks connected:</p>
            <ul className="list-disc list-inside space-y-1">
              {items.map((item: ConnectedItem) => (
                <li key={item.id}>
                  <strong>{item.institution?.name || "Unknown"}</strong> ({item.accounts.length} account
                  {item.accounts.length !== 1 ? "s" : ""})
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Only connect if you want to add a different bank. This app supports one connection per institution.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connect New Bank</CardTitle>
          <CardDescription>
            Link your bank account securely through Plaid. Your credentials are never stored on our servers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlaidLinkButton />
        </CardContent>
      </Card>
    </div>
  )
}
