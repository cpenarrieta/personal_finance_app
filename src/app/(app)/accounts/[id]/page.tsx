import { Suspense } from "react"
import { AccountDetailAsync } from "@/components/accounts/AccountDetailAsync"
import { AccountDetailSkeleton } from "@/components/accounts/AccountDetailSkeleton"

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<AccountDetailSkeleton />}>
      <AccountDetailAsync id={id} />
    </Suspense>
  )
}
