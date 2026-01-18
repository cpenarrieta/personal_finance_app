import { ReviewTransactionsConvex } from "@/components/review-transactions/ReviewTransactionsConvex"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Review Transactions",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ReviewTransactionsPage() {
  return <ReviewTransactionsConvex />
}
