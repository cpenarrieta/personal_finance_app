import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/prisma-extension";
import Link from "next/link";
import { TransactionAnalytics } from "@/components/TransactionAnalytics";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AnalyticsPage() {
  // Fetch all transactions and categories in parallel
  const transactionsPromise = prisma.transaction.findMany({
    where: {
      isSplit: false, // Filter out parent transactions that have been split
    },
    orderBy: { date: "desc" },
    include: {
      account: true,
      customCategory: true,
      customSubcategory: {
        include: {
          category: true,
        },
      },
    },
  });

  const categoriesPromise = prisma.customCategory.findMany({
    include: {
      subcategories: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const [transactions, categories] = await Promise.all([
    transactionsPromise,
    categoriesPromise,
  ]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Transaction Analytics
        </h1>
        <p className="text-gray-600 mt-1">
          Analyze your spending patterns by Plaid category and time
        </p>
      </div>

      <TransactionAnalytics
        transactions={serializeForClient(transactions)}
        categories={serializeForClient(categories)}
      />
    </div>
  );
}
