import { TransactionDetailConvex } from "@/components/transactions/detail/TransactionDetailConvex"

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <TransactionDetailConvex id={id} />
}
