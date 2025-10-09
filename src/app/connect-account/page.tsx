import PlaidLinkButton from '@/components/PlaidLinkButton'
import Link from 'next/link'

export default function ConnectAccountPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Connect Account</h1>
      <p className="text-gray-600">
        Connect your Wealthsimple account to sync your financial data.
      </p>
      <div className="space-y-4">
        <PlaidLinkButton />
      </div>
      <div className="mt-6">
        <Link className="underline hover:text-blue-600" href="/">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

