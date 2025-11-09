import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    // Fetch all transactions with full relations
    const transactions = await prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { date: "desc" },
      include: {
        account: true,
        category: true,
        subcategory: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // CSV Headers
    const headers = [
      "ID",
      "Plaid Transaction ID",
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
      "Category",
      "Subcategory",
      "Plaid Category",
      "Plaid Subcategory",
      "Payment Channel",
      "Tags",
      "Notes",
      "Is Split",
      "Parent Transaction ID",
      "Original Transaction ID",
      "Logo URL",
      "Category Icon URL",
      "Created At",
      "Updated At",
    ];

    // Convert transactions to CSV rows
    const csvRows = transactions.map((transaction) => {
      // Collect tag names
      const tagNames = transaction.tags.map((tt) => tt.tag.name).join("; ");

      return [
        transaction.id,
        transaction.plaidTransactionId || "",
        transaction.account?.name || "",
        transaction.account?.type || "",
        transaction.account?.mask || "",
        transaction.amount.toString(),
        transaction.isoCurrencyCode || "",
        transaction.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
        transaction.authorizedDate
          ? transaction.authorizedDate.toISOString().split("T")[0]
          : "",
        transaction.pending ? "Yes" : "No",
        transaction.merchantName || "",
        transaction.name || "",
        transaction.category?.name || "",
        transaction.subcategory?.name || "",
        transaction.plaidCategory || "",
        transaction.plaidSubcategory || "",
        transaction.paymentChannel || "",
        tagNames,
        transaction.notes || "",
        transaction.isSplit ? "Yes" : "No",
        transaction.parentTransactionId || "",
        transaction.originalTransactionId || "",
        transaction.logoUrl || "",
        transaction.categoryIconUrl || "",
        transaction.createdAt.toISOString(),
        transaction.updatedAt.toISOString(),
      ].map((field) => {
        // Escape fields containing commas, quotes, or newlines
        const stringField = String(field);
        if (
          stringField.includes(",") ||
          stringField.includes('"') ||
          stringField.includes("\n")
        ) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join(
      "\n"
    );

    // Return CSV with proper headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting transactions to CSV:", error);
    return NextResponse.json(
      { error: "Failed to export transactions" },
      { status: 500 }
    );
  }
}
