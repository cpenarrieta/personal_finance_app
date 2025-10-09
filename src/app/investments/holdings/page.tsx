import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { syncStockPrices } from '@/lib/syncPrices'
import { syncHoldingsLogos } from '@/lib/syncHoldingsLogos'
import { revalidatePath } from 'next/cache'
import { SyncPricesButton } from '@/components/SyncPricesButton'
import { SyncHoldingsLogosButton } from '@/components/SyncHoldingsLogosButton'
import { HoldingList } from '@/components/HoldingList'

async function doSyncPrices() {
  'use server'
  await syncStockPrices()
  revalidatePath('/investments/holdings')
}

async function doSyncHoldingsLogos() {
  'use server'
  await syncHoldingsLogos()
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
        <div className="flex gap-2">
          <SyncPricesButton action={doSyncPrices} />
          <SyncHoldingsLogosButton action={doSyncHoldingsLogos} />
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-4">Holdings</h2>
      <HoldingList holdings={holdings} showAccount={true} />
    </div>
  )
}
