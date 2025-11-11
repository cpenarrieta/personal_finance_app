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
      // Reuse the CSV endpoint
      const response = await fetch("/api/transactions/export/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionIds: filteredIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch CSV data");
      }

      // Get CSV text
      const csvText = await response.text();

      // Convert CSV to TSV (tab-separated values for Google Sheets)
      // Parse CSV properly handling quoted fields
      const lines = csvText.split("\n");
      const tsvLines = lines.map((line) => {
        if (!line.trim()) return "";

        const fields: string[] = [];
        let currentField = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            // Handle escaped quotes ("")
            if (inQuotes && line[i + 1] === '"') {
              currentField += '"';
              i++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            // End of field
            fields.push(currentField.replace(/\t/g, " ").replace(/\n/g, " "));
            currentField = "";
          } else {
            currentField += char;
          }
        }

        // Add last field
        fields.push(currentField.replace(/\t/g, " ").replace(/\n/g, " "));

        // Join with tabs
        return fields.join("\t");
      });

      const tsvContent = tsvLines.join("\n");

      // Copy to clipboard
      await navigator.clipboard.writeText(tsvContent);

      alert(
        `Copied ${filteredIds.length} transaction(s) to clipboard!\n\nNow:\n1. Open Google Sheets\n2. Click on cell A1\n3. Paste (Ctrl+V or Cmd+V)`
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
