import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

// Type for transaction with all relations we need
type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    account: {
      include: {
        item: true;
      };
    };
    category: true;
    subcategory: true;
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

export async function POST(req: NextRequest) {
  try {
    // Parse transaction IDs from request body
    const body = await req.json();
    const { transactionIds } = body;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return NextResponse.json(
        { error: "Invalid request: transactionIds array required" },
        { status: 400 }
      );
    }

    if (transactionIds.length === 0) {
      return NextResponse.json(
        { error: "No transactions to export" },
        { status: 400 }
      );
    }

    // Fetch only the specified transactions with full relations
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
      },
      include: {
        account: {
          include: {
            item: true,
          },
        },
        category: true,
        subcategory: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Maintain the order from the frontend (important for sorting)
    const transactionsMap = new Map<string, TransactionWithRelations>(
      transactions.map((t: TransactionWithRelations) => [t.id, t])
    );
    const orderedTransactions = transactionIds
      .map((id) => transactionsMap.get(id))
      .filter((t): t is TransactionWithRelations => t !== undefined);

    // CSV Headers
    const headers = [
      "ID",
      "Plaid Transaction ID",
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

    // Convert transactions to CSV rows
    const csvRows = orderedTransactions.map((transaction) => {
      // Collect tag names
      const tagNames = transaction.tags.map((tt) => tt.tag.name).join("; ");

      return [
        transaction.id,
        transaction.plaidTransactionId || "",
        transaction.accountId || "",
        transaction.account?.plaidAccountId || "",
        transaction.account?.itemId || "",
        transaction.account?.item?.institutionId || "",
        transaction.account?.name || "",
        transaction.account?.type || "",
        transaction.account?.mask || "",
        transaction.amount_number?.toString() || "",
        transaction.isoCurrencyCode || "",
        transaction.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
        transaction.authorizedDate
          ? transaction.authorizedDate.toISOString().split("T")[0]
          : "",
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
