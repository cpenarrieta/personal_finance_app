import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TransactionsPageClient } from "@/components/TransactionsPageClient";
import { PrismaIncludes } from "@/types/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banking Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TransactionsPage() {
  // Fetch all data in parallel on the server
  const [transactions, categories, tags, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: "desc" },
      include: PrismaIncludes.transaction,
    }),
    prisma.customCategory.findMany({
      include: {
        subcategories: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.plaidAccount.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <TransactionsPageClient
        transactions={transactions}
        categories={categories}
        tags={tags}
        accounts={accounts}
      />
    </div>
  );
}
