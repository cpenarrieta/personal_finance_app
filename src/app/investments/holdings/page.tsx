import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { syncStockPrices } from '@/lib/syncPrices'
import { revalidatePath } from 'next/cache'
import { SyncPricesButton } from '@/components/SyncPricesButton'
import { HoldingList } from '@/components/HoldingList'

async function doSyncPrices() {
  'use server'
  await syncStockPrices()
  revalidatePath('/investments/holdings')
}

export default async function HoldingsPage() {
  const holdings = await prisma.holding.findMany({
    include: { account: true, security: true },
  })
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <SyncPricesButton action={doSyncPrices} />
      </div>
      <h2 className="text-xl font-semibold mb-4">Holdings (current snapshot)</h2>
      <HoldingList holdings={holdings} showAccount={true} />
    </div>
  )
}
