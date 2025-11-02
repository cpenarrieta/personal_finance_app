import { prisma } from "@/lib/prisma";
import { TransactionsPageClient } from "@/components/TransactionsPageClient";
import { AppShell } from "@/components/AppShell";
import type { Metadata } from "next";
import type {
  CategoryForClient,
  PlaidAccountForClient,
  TagForClient,
} from "@/types";

export const metadata: Metadata = {
  title: "Banking Transactions",
  robots: {
    index: false,
    follow: false,
  },
};

import { parseTransactionFiltersFromUrl } from "@/lib/transactionUrlParams";

interface TransactionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const initialFilters = parseTransactionFiltersFromUrl(params);
  const [transactions, categories, tags, accounts] = await Promise.all([
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
        plaidCategory: true,
        plaidSubcategory: true,
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
            isTransferCategory: true,
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
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        groupType: true,
        displayOrder: true,
        isTransferCategory: true,
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
      orderBy: [
        { groupType: "asc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
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
    prisma.plaidAccount.findMany({
      select: {
        id: true,
        plaidAccountId: true,
        itemId: true,
        name: true,
        officialName: true,
        mask: true,
        type: true,
        subtype: true,
        currency: true,
        current_balance_number: true, // Generated column
        available_balance_number: true, // Generated column
        credit_limit_number: true, // Generated column
        balance_updated_at_string: true, // Generated column
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
      },
      orderBy: { name: "asc" },
    }) as PlaidAccountForClient[],
  ] as const);

  // Flatten tags structure (tags.tag → tags)
  const transactionsWithFlatTags = transactions.map(
    (t: (typeof transactions)[0]) => ({
      ...t,
      tags: t.tags.map((tt: (typeof t.tags)[0]) => tt.tag),
    })
  );

  return (
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Transactions" },
      ]}
    >
      <TransactionsPageClient
        transactions={transactionsWithFlatTags}
        categories={categories}
        tags={tags}
        accounts={accounts}
        initialFilters={initialFilters}
      />
    </AppShell>
  );
}
