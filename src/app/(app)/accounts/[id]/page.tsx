import { Suspense } from "react"
import type { Metadata } from "next"
import { getAccountById } from "@/lib/db/queries"
import { AccountDetailAsync } from "@/components/accounts/AccountDetailAsync"
import { AccountDetailSkeleton } from "@/components/accounts/AccountDetailSkeleton"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const account = await getAccountById(id)

  if (!account) {
    return {
      title: "Account Not Found",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${account.name}${account.mask ? ` • ${account.mask}` : ""}`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<AccountDetailSkeleton />}>
      <AccountDetailAsync id={id} />
    </Suspense>
  )
}
