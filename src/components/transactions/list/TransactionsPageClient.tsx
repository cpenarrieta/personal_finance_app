"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList";
import { AddTransactionModal } from "@/components/transactions/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type {
  TransactionForClient,
  CategoryForClient,
  TagForClient,
  PlaidAccountForClient,
} from "@/types";
import type { TransactionFiltersFromUrl } from "@/lib/transactions/url-params";

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
  const searchParams = useSearchParams();

  const handleDownloadCSV = () => {
    // Build CSV export URL with current filter parameters
    const params = searchParams.toString();
    const csvUrl = params
      ? `/api/transactions/export/csv?${params}`
      : "/api/transactions/export/csv";

    // Trigger CSV download
    window.location.href = csvUrl;
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
          <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            Add Transaction
          </Button>
        </div>
      </div>

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
