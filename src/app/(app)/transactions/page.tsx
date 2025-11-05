import { TransactionsPageClient } from "@/components/TransactionsPageClient";
import type { Metadata } from "next";
import {
  getAllTransactions,
  getAllCategories,
  getAllTags,
  getAllAccounts,
} from "@/lib/cached-queries";

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

  // Use cached queries for all data fetching
  const [transactions, categories, tags, accounts] = await Promise.all([
    getAllTransactions(),
    getAllCategories(),
    getAllTags(),
    getAllAccounts(),
  ] as const);

  // Flatten tags structure (tags.tag → tags)
  const transactionsWithFlatTags = transactions.map(
    (t: (typeof transactions)[0]) => ({
      ...t,
      tags: t.tags.map((tt: (typeof t.tags)[0]) => tt.tag),
    })
  );

  return (
    <TransactionsPageClient
      transactions={transactionsWithFlatTags}
      categories={categories}
      tags={tags}
      accounts={accounts}
      initialFilters={initialFilters}
    />
  );
}
