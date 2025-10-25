"use client";

import { useState } from "react";
import { SearchableTransactionList } from "./SearchableTransactionList";
import { AddTransactionModal } from "./AddTransactionModal";
import { Button } from "@/components/ui/button";
import type { SerializedTransaction } from "@/types";

type SerializedCategory = {
  id: string;
  name: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  subcategories: {
    id: string;
    categoryId: string;
    name: string;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
};

type SerializedTag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

type SerializedAccount = {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  currency: string | null;
};

interface TransactionsPageClientProps {
  transactions: SerializedTransaction[];
  categories: SerializedCategory[];
  tags: SerializedTag[];
  accounts: SerializedAccount[];
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
