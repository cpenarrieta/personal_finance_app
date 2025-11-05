"use client";

import { useState } from "react";
import { SearchableTransactionList } from "./SearchableTransactionList";
import { TransactionChartsView } from "./TransactionChartsView";
import { AddTransactionModal } from "./AddTransactionModal";
import { Button } from "@/components/ui/button";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  PlaidAccountForClient,
} from "@/types";
import type { TransactionFiltersFromUrl } from "@/lib/transactionUrlParams";

interface TransactionsPageClientProps{
  transactions: TransactionForClient[];
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts: PlaidAccountForClient[];
  initialFilters?: TransactionFiltersFromUrl;
}

export function TransactionsPageClient({
  transactions,
  categories,
  tags,
  accounts,
  initialFilters,
}: TransactionsPageClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
          <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Transaction
        </Button>
      </div>

      {/* Charts Section */}
      <div className="mb-6">
        <TransactionChartsView
          transactions={transactions}
          categories={categories}
        />
      </div>

      {/* Transactions Table with Filters */}
      <SearchableTransactionList
        transactions={transactions}
        categories={categories}
        tags={tags}
        accounts={accounts}
        initialFilters={initialFilters}
      />

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          categories={categories}
          tags={tags}
          accounts={accounts}
        />
      )}
    </>
  );
}
