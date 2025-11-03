import PlaidLinkButton from '@/components/PlaidLinkButton'
import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Connect Account',
  robots: {
    index: false,
    follow: false,
  },
}

export default function ConnectAccountPage() {
  return (
    <AppShell breadcrumbs={[{ label: "Connect Account" }]}>
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Connect Account</h1>
            <p className="text-muted-foreground mt-1">
              Connect your Wealthsimple account to sync your financial data.
            </p>
          </div>
          <div className="space-y-4">
            <PlaidLinkButton />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

