"use client";

import { useState } from "react";
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList";
import { TransactionChartsView } from "@/components/transactions/analytics/TransactionChartsView";
import { AddTransactionModal } from "@/components/transactions/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
          <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Transaction
        </Button>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <SearchableTransactionList
            transactions={transactions}
            categories={categories}
            tags={tags}
            accounts={accounts}
            initialFilters={initialFilters}
          />
        </TabsContent>
        <TabsContent value="charts">
          <TransactionChartsView
            transactions={transactions}
            categories={categories}
          />
        </TabsContent>
      </Tabs>

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
