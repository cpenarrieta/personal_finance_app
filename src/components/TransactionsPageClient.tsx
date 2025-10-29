"use client";

import { useState } from "react";
import { SearchableTransactionList } from "./SearchableTransactionList";
import { AddTransactionModal } from "./AddTransactionModal";
import { Button } from "@/components/ui/button";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  PlaidAccountForClient,
} from "@/types";

interface TransactionsPageClientProps{
  transactions: TransactionForClient[];
  categories: CategoryForClient[];
  tags: TagForClient[];
  accounts: PlaidAccountForClient[];
}

export function TransactionsPageClient({
  transactions,
  categories,
  tags,
  accounts,
}: TransactionsPageClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banking Transactions</h1>
          <p className="text-gray-600 mt-1">View and search all your banking transactions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Transaction
        </Button>
      </div>

      <SearchableTransactionList
        transactions={transactions}
        categories={categories}
        tags={tags}
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
