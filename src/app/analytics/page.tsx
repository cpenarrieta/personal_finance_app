import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TransactionAnalytics } from "@/components/TransactionAnalytics";
import type { Metadata } from "next";
import type { CategoryForClient } from "@/types";

export const metadata: Metadata = {
  title: "Transaction Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AnalyticsPage() {
  // Fetch all transactions and categories in parallel
  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        plaidTransactionId: true,
        accountId: true,
        amount_number: true, // Generated column
        isoCurrencyCode: true,
        date_string: true, // Generated column
        authorized_date_string: true, // Generated column
        pending: true,
        merchantName: true,
        name: true,
        category: true,
        subcategory: true,
        paymentChannel: true,
        pendingTransactionId: true,
        logoUrl: true,
        categoryIconUrl: true,
        categoryId: true,
        customSubcategoryId: true,
        notes: true,
        isSplit: true,
        parentTransactionId: true,
        originalTransactionId: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            mask: true,
            current_balance_number: true, // Generated column
            available_balance_number: true, // Generated column
            credit_limit_number: true, // Generated column
            balance_updated_at_string: true, // Generated column
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        customSubcategory: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
            category: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                created_at_string: true, // Generated column
                updated_at_string: true, // Generated column
              },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
        subcategories: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }) as Promise<CategoryForClient[]>,
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
        transactions={transactions}
        categories={categories}
      />
    </div>
  );
}
