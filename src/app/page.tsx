import Link from 'next/link'
import { syncAllItems } from '@/lib/sync'
import { revalidatePath } from 'next/cache'
import { SyncButton } from '@/components/SyncButton'
import { FreshSyncButton } from '@/components/FreshSyncButton'
import { prisma } from '@/lib/prisma'

async function doSync() {
  'use server'
  await syncAllItems()
  revalidatePath('/', 'layout')
}

async function doFreshSync() {
  'use server'
  // Clear all cursors
  await prisma.item.updateMany({
    data: {
      lastTransactionsCursor: null,
      lastInvestmentsCursor: null,
    },
  })
  // Run full sync
  await syncAllItems()
  revalidatePath('/', 'layout')
}

export default async function Page() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Personal Finance (Local)</h1>
      <div className="space-y-4">
        <Link href="/connect-account">
          <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800">
            Connect Account
          </button>
        </Link>
        <div className="flex gap-2">
          <SyncButton action={doSync} />
          <FreshSyncButton action={doFreshSync} />
        </div>
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
        <Link className="underline hover:text-blue-600" href="/manage-categories">
          Manage Categories
        </Link>
      </div>
    </div>
  )
}
