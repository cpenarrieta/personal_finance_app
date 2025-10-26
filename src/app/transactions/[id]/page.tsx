import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionDetailView } from "@/components/TransactionDetailView";
import { headers } from "next/headers";
import type { TransactionWithRelations } from "@/types";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const transaction = (await prisma.transaction.findUnique({
    where: { id },
  })) as TransactionWithRelations;

  if (!transaction) {
    return {
      title: "Transaction Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `Transaction | ${transaction.name}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headersList = await headers();
  const referer = headersList.get("referer") || "";

  const transaction = (await prisma.transaction.findUnique({
    where: { id },
    include: {
      account: true,
      customCategory: true,
      customSubcategory: true,
      tags: {
        include: {
          tag: true,
        },
      },
      parentTransaction: {
        include: {
          customCategory: true,
        },
      },
      childTransactions: {
        include: {
          customCategory: true,
          customSubcategory: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })) as TransactionWithRelations;

  if (!transaction) {
    notFound();
  }

  // Fetch categories and tags (needed for transaction editing)
  const [categories, tags] = await Promise.all([
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
  ]);

  // Determine which page to go back to based on referrer
  const isFromAnalytics = referer.includes("/analytics");
  const backUrl = isFromAnalytics ? "/analytics" : "/transactions";
  const backText = isFromAnalytics
    ? "← Back to Analytics"
    : "← Back to Transactions";

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Link href={backUrl} className="text-blue-600 hover:underline">
          {backText}
        </Link>
      </div>

      <TransactionDetailView
        transaction={transaction}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
