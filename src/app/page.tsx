import PlaidLinkButton from '@/components/PlaidLinkButton'
import Link from 'next/link'
import { syncAllItems } from '@/lib/sync'
import { revalidatePath } from 'next/cache'

async function SyncButton() {
  async function doSync() {
    'use server'
    await syncAllItems()
    revalidatePath('/', 'layout')
  }
  return (
    <form action={doSync}>
      <button className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50">
        Run Sync
      </button>
    </form>
  )
}

export default async function Page() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Personal Finance (Local)</h1>
      <div className="space-y-4">
        <PlaidLinkButton />
        <SyncButton />
      </div>
      <div className="space-x-4">
        <Link className="underline hover:text-blue-600" href="/accounts">
          Accounts
        </Link>
        <Link className="underline hover:text-blue-600" href="/transactions">
          Banking Transactions
        </Link>
        <Link className="underline hover:text-blue-600" href="/investments/transactions">
          Investment Transactions
        </Link>
        <Link className="underline hover:text-blue-600" href="/investments/holdings">
          Holdings
        </Link>
      </div>
    </div>
  )
}
