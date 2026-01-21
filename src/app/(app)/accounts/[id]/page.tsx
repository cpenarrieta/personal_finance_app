import { AccountDetailConvex } from "@/components/accounts/AccountDetailConvex"

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <AccountDetailConvex id={id} />
}
