import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionDetailView } from "@/components/TransactionDetailView";
import { headers } from "next/headers";
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    return {
      title: 'Transaction Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${transaction.merchantName || transaction.name}`,
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

  const transaction = await prisma.transaction.findUnique({
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
          createdAt: 'asc',
        },
      },
    },
  });

  if (!transaction) {
    notFound();
  }

  // Serialize transaction for client component
  const serializedTransaction = {
    id: transaction.id,
    plaidTransactionId: transaction.plaidTransactionId,
    accountId: transaction.accountId,
    amount: transaction.amount.toString(),
    isoCurrencyCode: transaction.isoCurrencyCode,
    date: transaction.date.toISOString(),
    authorizedDate: transaction.authorizedDate?.toISOString() || null,
    pending: transaction.pending,
    merchantName: transaction.merchantName,
    name: transaction.name,
    category: transaction.category,
    subcategory: transaction.subcategory,
    paymentChannel: transaction.paymentChannel,
    pendingTransactionId: transaction.pendingTransactionId,
    logoUrl: transaction.logoUrl,
    categoryIconUrl: transaction.categoryIconUrl,
    customCategoryId: transaction.customCategoryId,
    customSubcategoryId: transaction.customSubcategoryId,
    notes: transaction.notes,
    tags: transaction.tags?.map((tt) => ({
      id: tt.tag.id,
      name: tt.tag.name,
      color: tt.tag.color,
    })) || [],
    // Split transaction fields
    isSplit: transaction.isSplit,
    parentTransactionId: transaction.parentTransactionId,
    originalTransactionId: transaction.originalTransactionId,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    account: transaction.account
      ? {
          id: transaction.account.id,
          name: transaction.account.name,
          type: transaction.account.type,
          mask: transaction.account.mask,
        }
      : null,
    customCategory: transaction.customCategory
      ? {
          id: transaction.customCategory.id,
          name: transaction.customCategory.name,
          imageUrl: transaction.customCategory.imageUrl,
          createdAt: transaction.customCategory.createdAt.toISOString(),
          updatedAt: transaction.customCategory.updatedAt.toISOString(),
        }
      : null,
    customSubcategory: transaction.customSubcategory
      ? {
          id: transaction.customSubcategory.id,
          name: transaction.customSubcategory.name,
          imageUrl: transaction.customSubcategory.imageUrl,
          categoryId: transaction.customSubcategory.categoryId,
          createdAt: transaction.customSubcategory.createdAt.toISOString(),
          updatedAt: transaction.customSubcategory.updatedAt.toISOString(),
        }
      : null,
    parentTransaction: transaction.parentTransaction
      ? {
          id: transaction.parentTransaction.id,
          name: transaction.parentTransaction.name,
          amount: transaction.parentTransaction.amount.toString(),
          date: transaction.parentTransaction.date.toISOString(),
          customCategory: transaction.parentTransaction.customCategory
            ? {
                id: transaction.parentTransaction.customCategory.id,
                name: transaction.parentTransaction.customCategory.name,
              }
            : null,
        }
      : null,
    childTransactions: transaction.childTransactions?.map((child) => ({
      id: child.id,
      name: child.name,
      amount: child.amount.toString(),
      date: child.date.toISOString(),
      customCategory: child.customCategory
        ? {
            id: child.customCategory.id,
            name: child.customCategory.name,
          }
        : null,
      customSubcategory: child.customSubcategory
        ? {
            id: child.customSubcategory.id,
            name: child.customSubcategory.name,
          }
        : null,
    })) || [],
  };

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

      <TransactionDetailView transaction={serializedTransaction} />
    </div>
  );
}
