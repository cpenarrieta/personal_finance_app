import { prisma } from "@/lib/prisma";
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

  // Serialize transactions to make them compatible with client components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedTransactions = transactions.map((t: any) => ({
    ...t,
    amount: t.amount.toString(), // Convert Decimal to string
    date: t.date.toISOString(),
    authorizedDate: t.authorizedDate?.toISOString() || null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account
      ? {
          ...t.account,
          currentBalance: t.account.currentBalance?.toString() || null,
          availableBalance: t.account.availableBalance?.toString() || null,
          creditLimit: t.account.creditLimit?.toString() || null,
          balanceUpdatedAt: t.account.balanceUpdatedAt?.toISOString() || null,
          createdAt: t.account.createdAt.toISOString(),
          updatedAt: t.account.updatedAt.toISOString(),
        }
      : null,
    customCategory: t.customCategory
      ? {
          ...t.customCategory,
          createdAt: t.customCategory.createdAt.toISOString(),
          updatedAt: t.customCategory.updatedAt.toISOString(),
        }
      : null,
    customSubcategory: t.customSubcategory
      ? {
          ...t.customSubcategory,
          createdAt: t.customSubcategory.createdAt.toISOString(),
          updatedAt: t.customSubcategory.updatedAt.toISOString(),
          category: t.customSubcategory.category
            ? {
                ...t.customSubcategory.category,
                createdAt: t.customSubcategory.category.createdAt.toISOString(),
                updatedAt: t.customSubcategory.category.updatedAt.toISOString(),
              }
            : undefined,
        }
      : null,
  }));

  // Serialize categories
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedCategories = categories.map((cat: any) => ({
    ...cat,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subcategories: cat.subcategories.map((sub: any) => ({
      ...sub,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })),
  }));

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
        transactions={serializedTransactions}
        categories={serializedCategories}
      />
    </div>
  );
}
