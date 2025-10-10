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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Personal Finance Dashboard</h1>
          <p className="text-gray-600">Manage your accounts, track investments, and analyze spending</p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/connect-account">
              <button className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm transition-colors">
                + Connect New Account
              </button>
            </Link>
            <SyncButton action={doSync} />
            <FreshSyncButton action={doFreshSync} />
          </div>
        </div>

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Banking Section */}
          <div className="bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-blue-600 text-white px-6 py-4">
              <h3 className="text-xl font-semibold">Banking</h3>
              <p className="text-sm text-blue-100 mt-1">Manage your bank accounts and transactions</p>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/accounts" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Accounts</div>
                <div className="text-sm text-gray-600">View all connected accounts</div>
              </Link>
              <Link href="/transactions" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Transactions</div>
                <div className="text-sm text-gray-600">Browse banking transactions</div>
              </Link>
              <Link href="/analytics" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Analytics</div>
                <div className="text-sm text-gray-600">Spending insights & charts</div>
              </Link>
            </div>
          </div>

          {/* Investments Section */}
          <div className="bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-green-600 text-white px-6 py-4">
              <h3 className="text-xl font-semibold">Investments</h3>
              <p className="text-sm text-green-100 mt-1">Track your portfolio and holdings</p>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/investments/holdings" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Holdings</div>
                <div className="text-sm text-gray-600">Portfolio & performance tracking</div>
              </Link>
              <Link href="/investments/transactions" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Transactions</div>
                <div className="text-sm text-gray-600">Investment activity history</div>
              </Link>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-white rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-purple-600 text-white px-6 py-4">
              <h3 className="text-xl font-semibold">Settings</h3>
              <p className="text-sm text-purple-100 mt-1">Configure categories and preferences</p>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/manage-categories" className="block p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                <div className="font-medium text-gray-900">Manage Categories</div>
                <div className="text-sm text-gray-600">Customize transaction categories</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Connected to Plaid • Securely managing your financial data locally</p>
        </div>
      </div>
    </div>
  )
}
