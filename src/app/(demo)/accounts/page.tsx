import { Suspense } from "react"
import type { Metadata } from "next"
import { DemoAccountsListAsync } from "@/components/demo/DemoAccountsListAsync"
import { AccountsListSkeleton } from "@/components/accounts/AccountsListSkeleton"

export const metadata: Metadata = {
  title: "Demo - Accounts",
  robots: { index: true, follow: false },
}

export default function DemoAccountsPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Accounts</h2>
      <Suspense fallback={<AccountsListSkeleton />}>
        <DemoAccountsListAsync />
      </Suspense>
    </>
  )
}
