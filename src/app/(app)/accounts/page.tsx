import { Suspense } from "react"
import type { Metadata } from "next"
import { AccountsListAsync } from "@/components/accounts/AccountsListAsync"
import { AccountsListSkeleton } from "@/components/accounts/AccountsListSkeleton"

export const metadata: Metadata = {
  title: "Accounts",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AccountsPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Accounts</h2>
      <Suspense fallback={<AccountsListSkeleton />}>
        <AccountsListAsync />
      </Suspense>
    </>
  )
}
