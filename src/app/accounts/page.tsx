import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accounts',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({ 
    include: { 
      item: { 
        include: { 
          institution: true 
        } 
      } 
    } 
  })

  // Group accounts by institution
  const accountsByInstitution = accounts.reduce((acc, account) => {
    const institutionName = account.item?.institution?.name || 'Unknown Institution'
    if (!acc[institutionName]) {
      acc[institutionName] = {
        accounts: [],
        logoUrl: account.item?.institution?.logoUrl || null
      }
    }
    acc[institutionName].accounts.push(account)
    return acc
  }, {} as Record<string, { accounts: typeof accounts, logoUrl: string | null }>)

  const institutionNames = Object.keys(accountsByInstitution).sort()

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Accounts</h2>
      {accounts.length === 0 ? (
        <p className="text-gray-500">No accounts found. Connect your bank and run sync.</p>
      ) : (
        <div className="space-y-6">
          {institutionNames.map(institutionName => (
            <div key={institutionName} className="space-y-2">
              <div className="flex items-center gap-3 border-b pb-2">
                {accountsByInstitution[institutionName].logoUrl && (
                  <Image 
                    src={accountsByInstitution[institutionName].logoUrl} 
                    alt={`${institutionName} logo`}
                    width={32}
                    height={32}
                    className="rounded object-contain"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-800">
                  {institutionName}
                </h3>
              </div>
              <ul className="space-y-2 pl-2">
                {accountsByInstitution[institutionName].accounts.map(a => (
                  <li key={a.id}>
                    <Link href={`/accounts/${a.id}`} className="block border p-3 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="font-medium">
                        {a.name} {a.mask ? `• ${a.mask}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {a.type}
                        {a.subtype ? ` / ${a.subtype}` : ''} · {a.currency}
                      </div>
                      {(a.currentBalance || a.availableBalance) && (
                        <div className="text-sm text-gray-700 mt-1">
                          {a.currentBalance && (
                            <span>Balance: ${Number(a.currentBalance).toFixed(2)}</span>
                          )}
                          {a.availableBalance && a.currentBalance && ' · '}
                          {a.availableBalance && (
                            <span>Available: ${Number(a.availableBalance).toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
