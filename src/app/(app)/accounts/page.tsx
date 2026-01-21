import type { Metadata } from "next"
import { AccountsListConvex } from "@/components/accounts/AccountsListConvex"

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
      <AccountsListConvex />
    </>
  )
}
