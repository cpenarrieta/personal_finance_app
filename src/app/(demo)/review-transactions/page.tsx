import { ReviewTransactionsConvex } from "@/components/review-transactions/ReviewTransactionsConvex"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Demo - Review Transactions",
  robots: { index: true, follow: false },
}

export default function DemoReviewTransactionsPage() {
  return <ReviewTransactionsConvex />
}
