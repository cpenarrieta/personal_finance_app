"use client";

import { useState, useRef } from "react";
import { SearchableTransactionList } from "@/components/transactions/list/SearchableTransactionList";
import { AddTransactionModal } from "@/components/transactions/modals/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { Download, Sheet } from "lucide-react";
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Use ref instead of state - updates won't cause re-renders
  const filteredTransactionIdsRef = useRef<string[]>([]);

  const handleDownloadCSV = async () => {
    const filteredIds = filteredTransactionIdsRef.current;

    if (filteredIds.length === 0) {
      alert("No transactions to export");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch("/api/transactions/export/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionIds: filteredIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to download CSV");
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyForGoogleSheets = async () => {
    const filteredIds = filteredTransactionIdsRef.current;

    if (filteredIds.length === 0) {
      alert("No transactions to copy");
      return;
    }

    setIsCopying(true);
    try {
      // Get filtered transactions in order
      const filteredTransactions = filteredIds
        .map((id) => transactions.find((t) => t.id === id))
        .filter((t): t is TransactionForClient => t !== undefined);

      // TSV Headers (tab-separated)
      const headers = [
        "ID",
        "Plaid Transaction ID",
        "Pending Transaction ID",
        "Account ID",
        "Plaid Account ID",
        "Item ID",
        "Institution ID",
        "Account Name",
        "Account Type",
        "Account Mask",
        "Amount",
        "Currency",
        "Date",
        "Authorized Date",
        "Pending",
        "Merchant Name",
        "Name",
        "Category ID",
        "Category",
        "Subcategory ID",
        "Subcategory",
        "Payment Channel",
        "Tags",
        "Notes",
        "Is Manual",
        "Is Split",
        "Parent Transaction ID",
        "Original Transaction ID",
        "Logo URL",
        "Category Icon URL",
        "Created At",
        "Updated At",
      ];

      // Convert transactions to TSV rows
      const tsvRows = filteredTransactions.map((transaction) => {
        const tagNames = transaction.tags.map((tag) => tag.name).join("; ");

        return [
          transaction.id,
          transaction.plaidTransactionId || "",
          transaction.pendingTransactionId || "",
          transaction.accountId || "",
          transaction.account?.plaidAccountId || "",
          transaction.account?.itemId || "",
          transaction.account?.item?.institutionId || "",
          transaction.account?.name || "",
          transaction.account?.type || "",
          transaction.account?.mask || "",
          transaction.amount_number?.toString() || "",
          transaction.isoCurrencyCode || "",
          transaction.date_string || "",
          transaction.authorizedDate_string || "",
          transaction.pending ? "Yes" : "No",
          transaction.merchantName || "",
          transaction.name || "",
          transaction.categoryId || "",
          transaction.category?.name || "",
          transaction.subcategoryId || "",
          transaction.subcategory?.name || "",
          transaction.paymentChannel || "",
          tagNames,
          transaction.notes || "",
          transaction.isManual ? "Yes" : "No",
          transaction.isSplit ? "Yes" : "No",
          transaction.parentTransactionId || "",
          transaction.originalTransactionId || "",
          transaction.logoUrl || "",
          transaction.categoryIconUrl || "",
          transaction.createdAt_string || "",
          transaction.updatedAt_string || "",
        ].map((field) => {
          // Escape tabs and newlines in field values
          const stringField = String(field);
          return stringField.replace(/\t/g, " ").replace(/\n/g, " ");
        });
      });

      // Combine headers and rows with tabs
      const tsvContent = [
        headers.join("\t"),
        ...tsvRows.map((row) => row.join("\t")),
      ].join("\n");

      // Copy to clipboard
      await navigator.clipboard.writeText(tsvContent);

      alert(
        `Copied ${filteredTransactions.length} transaction(s) to clipboard!\n\nNow:\n1. Open Google Sheets\n2. Click on cell A1\n3. Paste (Ctrl+V or Cmd+V)`
      );
    } catch (error) {
      console.error("Error copying for Google Sheets:", error);
      alert("Failed to copy to clipboard. Please try again.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Banking Transactions</h1>
          <p className="text-muted-foreground mt-1">View and search all your banking transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyForGoogleSheets}
            disabled={isCopying}
          >
            <Sheet className="h-4 w-4 mr-2" />
            {isCopying ? "Copying..." : "Copy for Sheets"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download CSV"}
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
        onFilteredTransactionsChange={(ids) => {
          filteredTransactionIdsRef.current = ids;
        }}
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
