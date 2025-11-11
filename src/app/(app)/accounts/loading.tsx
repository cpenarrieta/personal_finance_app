import { AccountsListSkeleton } from "@/components/accounts/AccountsListSkeleton"

export default function Loading() {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">Accounts</h2>
      <AccountsListSkeleton />
    </>
  )
}
