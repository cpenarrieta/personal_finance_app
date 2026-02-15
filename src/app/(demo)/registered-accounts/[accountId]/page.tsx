import { AccountDetail } from "@/components/registered-accounts/AccountDetail"

export default async function DemoRegisteredAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = await params

  return <AccountDetail accountId={accountId} />
}
