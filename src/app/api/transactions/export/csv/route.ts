import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseTransactionFiltersFromUrl } from "@/lib/transactions/url-params";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // Parse filters from URL query parameters
    const searchParams = req.nextUrl.searchParams;
    const filters = parseTransactionFiltersFromUrl(searchParams);

    // Build Prisma where clause
    const where: Prisma.TransactionWhereInput = {
      isSplit: false, // Filter out parent transactions that have been split
    };

    // Date range filter
    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date();
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      let dateFilter: { gte?: Date; lte?: Date } = {};

      switch (filters.dateRange) {
        case "last30": {
          const start = new Date(now);
          start.setDate(now.getDate() - 29);
          start.setHours(0, 0, 0, 0);
          dateFilter = { gte: start, lte: endOfToday };
          break;
        }
        case "last90": {
          const start = new Date(now);
          start.setDate(now.getDate() - 89);
          start.setHours(0, 0, 0, 0);
          dateFilter = { gte: start, lte: endOfToday };
          break;
        }
        case "thisMonth":
          dateFilter = { gte: startOfMonth(now), lte: endOfMonth(now) };
          break;
        case "lastMonth": {
          const lastMonth = subMonths(now, 1);
          dateFilter = {
            gte: startOfMonth(lastMonth),
            lte: endOfMonth(lastMonth),
          };
          break;
        }
        case "custom":
          if (filters.customStartDate && filters.customEndDate) {
            dateFilter = {
              gte: new Date(filters.customStartDate),
              lte: new Date(filters.customEndDate),
            };
          }
          break;
      }

      if (dateFilter.gte || dateFilter.lte) {
        where.date = dateFilter;
      }
    }

    // Income/Expense/Transfer filter
    const showIncome = filters.showIncome ?? true;
    const showExpenses = filters.showExpenses ?? true;
    const showTransfers = filters.showTransfers ?? false;

    // Build amount filter based on income/expense toggles
    const amountConditions: Prisma.TransactionWhereInput[] = [];

    if (!showTransfers) {
      // Exclude transfers if showTransfers is false
      where.category = {
        ...((where.category as Prisma.CategoryWhereInput) || {}),
        isTransferCategory: false,
      };
    }

    // Apply income/expense filters only for non-transfers
    if (!showIncome || !showExpenses) {
      if (showIncome && !showExpenses) {
        // Show only income (positive amounts) - but this would conflict with transfer exclusion
        // We need to handle this with OR logic
        amountConditions.push({ amount: { gte: 0 } });
      } else if (!showIncome && showExpenses) {
        // Show only expenses (negative amounts)
        amountConditions.push({ amount: { lt: 0 } });
      } else if (!showIncome && !showExpenses) {
        // Show neither - return empty result
        where.id = "impossible-id-match";
      }
    }

    // Category filters
    if (filters.selectedCategoryIds && filters.selectedCategoryIds.size > 0) {
      where.categoryId = { in: Array.from(filters.selectedCategoryIds) };
    }

    if (
      filters.selectedSubcategoryIds &&
      filters.selectedSubcategoryIds.size > 0
    ) {
      where.subcategoryId = { in: Array.from(filters.selectedSubcategoryIds) };
    }

    if (filters.excludedCategoryIds && filters.excludedCategoryIds.size > 0) {
      where.categoryId = {
        ...((where.categoryId as any) || {}),
        notIn: Array.from(filters.excludedCategoryIds),
      };
    }

    // Account filter
    if (filters.selectedAccountIds && filters.selectedAccountIds.size > 0) {
      where.accountId = { in: Array.from(filters.selectedAccountIds) };
    }

    // Tag filter
    if (filters.selectedTagIds && filters.selectedTagIds.size > 0) {
      where.tags = {
        some: {
          tagId: { in: Array.from(filters.selectedTagIds) },
        },
      };
    }

    // Uncategorized filter
    if (filters.showOnlyUncategorized) {
      where.categoryId = null;
      where.subcategoryId = null;
    }

    // Search query filter (need to apply client-side due to OR across multiple fields)
    // We'll fetch and filter after

    // Build orderBy
    let orderBy: Prisma.TransactionOrderByWithRelationInput = { date: "desc" };
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "date":
          orderBy = { date: filters.sortDirection || "desc" };
          break;
        case "createdAt":
          orderBy = { createdAt: filters.sortDirection || "desc" };
          break;
        case "amount":
          orderBy = { amount: filters.sortDirection || "desc" };
          break;
        case "name":
          orderBy = { name: filters.sortDirection || "desc" };
          break;
        case "merchant":
          orderBy = { merchantName: filters.sortDirection || "desc" };
          break;
      }
    }

    // Fetch all transactions with full relations
    let transactions = await prisma.transaction.findMany({
      where,
      orderBy,
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

    // Apply search filter client-side (complex OR query)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      transactions = transactions.filter((t) => {
        const tagNames = t.tags.map((tt) => tt.tag.name).join(" ");
        const searchableText = [
          t.name,
          t.merchantName,
          t.category?.name,
          t.subcategory?.name,
          t.account?.name,
          t.isoCurrencyCode,
          t.amount.toString(),
          t.notes,
          tagNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    // Apply income/expense amount filter client-side if needed
    if (amountConditions.length > 0 && !showTransfers) {
      transactions = transactions.filter((t) => {
        const isTransfer = t.category?.isTransferCategory === true;
        if (isTransfer) return showTransfers;

        const amount = Number(t.amount);
        if (showIncome && !showExpenses) {
          return amount >= 0;
        } else if (!showIncome && showExpenses) {
          return amount < 0;
        }
        return true;
      });
    }

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
