/**
 * Export utilities for transactions
 */

/**
 * Downloads transactions as CSV file
 */
export async function downloadTransactionsCSV(
  transactionIds: string[]
): Promise<void> {
  const response = await fetch("/api/transactions/export/csv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactionIds }),
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
}

/**
 * Converts CSV text to TSV (tab-separated values)
 */
function csvToTsv(csvText: string): string {
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

  return tsvLines.join("\n");
}

/**
 * Copies transactions to clipboard in TSV format for Google Sheets
 */
export async function copyTransactionsForGoogleSheets(
  transactionIds: string[]
): Promise<void> {
  // Reuse the CSV endpoint
  const response = await fetch("/api/transactions/export/csv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactionIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch CSV data");
  }

  // Get CSV text
  const csvText = await response.text();

  // Convert CSV to TSV (tab-separated values for Google Sheets)
  const tsvContent = csvToTsv(csvText);

  // Copy to clipboard
  await navigator.clipboard.writeText(tsvContent);
}
