import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { TransactionWithRelations } from "@/types";

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
      customCategoryId: categoryId,
      isSplit: false, // Filter out parent transactions that have been split
    };

    // If subcategoryId is provided, filter by it (can be null for "no subcategory")
    if (subcategoryId !== null && subcategoryId !== undefined) {
      whereClause.customSubcategoryId =
        subcategoryId === "null" ? null : subcategoryId;
    }

    const transactions = (await prisma.transaction.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            id: true,
            name: true,
          },
        },
        customCategory: true,
        customSubcategory: true,
      },
      orderBy: {
        date: "desc",
      },
    })) as TransactionWithRelations[];

    // Serialize the transactions (convert Decimal to string)
    const serializedTransactions = transactions.map((t) => ({
      ...t,
      amount: t.amount.toString(),
      account: t.account
        ? {
            ...t.account,
            currentBalance: null,
            availableBalance: null,
            creditLimit: null,
          }
        : null,
    }));

    return NextResponse.json(serializedTransactions);
  } catch (error) {
    console.error("Error fetching transactions by category:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
