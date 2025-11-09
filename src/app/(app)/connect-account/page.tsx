import PlaidLinkButton from '@/components/sync/PlaidLinkButton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connect Account',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConnectAccountPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Connect Account</h1>
        <p className="text-muted-foreground mt-1">
          Connect your Wealthsimple account to sync your financial data.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Only for connecting new accounts. To reauthenticate, go to <Link href="/settings/connections" className="underline font-medium">Settings → Connections</Link>.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <PlaidLinkButton />
      </div>
    </div>
  )
}

