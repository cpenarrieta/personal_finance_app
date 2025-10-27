import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionDetailView } from "@/components/TransactionDetailView";
import { headers } from "next/headers";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
} from "@/types";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: {
      name: true,
    },
  });

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

  const txResult = await prisma.transaction.findUnique({
    where: { id },
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
      subcategoryId: true,
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
      subcategory: {
        select: {
          id: true,
          categoryId: true,
          name: true,
          imageUrl: true,
          created_at_string: true, // Generated column
          updated_at_string: true, // Generated column
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
              created_at_string: true, // Generated column
              updated_at_string: true, // Generated column
            },
          },
        },
      },
      parentTransaction: {
        select: {
          id: true,
          name: true,
          amount_number: true, // Generated column
          date_string: true, // Generated column
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      childTransactions: {
        select: {
          id: true,
          name: true,
          amount_number: true, // Generated column
          date_string: true, // Generated column
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subcategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!txResult) {
    notFound();
  }

  // Flatten tags structure
  const transaction: TransactionForClient = {
    ...txResult,
    tags: txResult.tags.map((tt: typeof txResult.tags[0]) => tt.tag),
  };

  // Fetch categories and tags (needed for transaction editing)
  const [categories, tags] = await Promise.all([
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
    }) as CategoryForClient[],
    prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
      },
      orderBy: { name: "asc" },
    }) as TagForClient[],
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
