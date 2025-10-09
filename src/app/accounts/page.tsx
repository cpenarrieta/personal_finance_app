import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({ include: { item: true } })
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
        <ul className="space-y-2">
          {accounts.map(a => (
            <li key={a.id}>
              <Link href={`/accounts/${a.id}`} className="block border p-3 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="font-medium">
                  {a.name} {a.mask ? `• ${a.mask}` : ''}
                </div>
                <div className="text-sm text-gray-600">
                  {a.type}
                  {a.subtype ? ` / ${a.subtype}` : ''} · {a.currency}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
