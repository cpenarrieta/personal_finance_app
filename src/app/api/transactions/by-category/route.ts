import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Build the where clause with proper typing
    const whereClause: Prisma.TransactionWhereInput = {
      categoryId: categoryId,
      isSplit: false, // Filter out parent transactions that have been split
    };

    // If subcategoryId is provided, filter by it (can be null for "no subcategory")
    if (subcategoryId !== null && subcategoryId !== undefined) {
      whereClause.subcategoryId =
        subcategoryId === "null" ? null : subcategoryId;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      select: {
        id: true,
        plaidTransactionId: true,
        accountId: true,
        amount_number: true, // Generated column
        isoCurrencyCode: true,
        date_string: true, // Generated column
        authorized_date_string: true, // Generated column
        pending: true,
        merchantName: true,
        name: true,
        plaidCategory: true,
        plaidSubcategory: true,
        paymentChannel: true,
        pendingTransactionId: true,
        logoUrl: true,
        categoryIconUrl: true,
        categoryId: true,
        subcategoryId: true,
        notes: true,
        isSplit: true,
        parentTransactionId: true,
        originalTransactionId: true,
        created_at_string: true, // Generated column
        updated_at_string: true, // Generated column
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            mask: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        subcategory: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
            created_at_string: true, // Generated column
            updated_at_string: true, // Generated column
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                created_at_string: true, // Generated column
                updated_at_string: true, // Generated column
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Flatten tags structure
    const transactionsWithFlatTags = transactions.map((t: typeof transactions[0]) => ({
      ...t,
      tags: t.tags.map((tt: typeof t.tags[0]) => tt.tag),
    }));

    return NextResponse.json(transactionsWithFlatTags);
  } catch (error) {
    console.error("Error fetching transactions by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
