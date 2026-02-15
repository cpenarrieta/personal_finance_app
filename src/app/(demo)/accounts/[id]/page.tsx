import { Suspense } from "react"
import { DemoAccountDetailAsync } from "@/components/demo/DemoAccountDetailAsync"
import { AccountDetailSkeleton } from "@/components/accounts/AccountDetailSkeleton"

export default async function DemoAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<AccountDetailSkeleton />}>
      <DemoAccountDetailAsync id={id} />
    </Suspense>
  )
}
