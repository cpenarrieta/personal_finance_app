import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { createTransactionSchema } from "@/types/api"
import { safeParseRequestBody } from "@/types/api"
import { Prisma } from "@prisma/client"
import { nanoid } from "nanoid"
import { revalidateTag, revalidatePath } from "next/cache"

/**
 * GET /api/transactions - Fetch recent transactions
 * Returns last 100 transactions ordered by date (descending)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500) // Max 500

    const transactions = await prisma.transaction.findMany({
      where: {
        isSplit: false, // Filter out parent transactions that have been split
      },
      orderBy: { datetime: "desc" },
      take: limit,
      select: {
        id: true,
        plaidTransactionId: true,
        accountId: true,
        amount_number: true,
        isoCurrencyCode: true,
        datetime: true,
        authorizedDatetime: true,
        pending: true,
        merchantName: true,
        name: true,
        plaidCategory: true,
        plaidSubcategory: true,
        paymentChannel: true,
        logoUrl: true,
        categoryIconUrl: true,
        categoryId: true,
        subcategoryId: true,
        notes: true,
        isSplit: true,
        isManual: true,
        created_at_string: true,
        updated_at_string: true,
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
            isTransferCategory: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            imageUrl: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ transactions, count: transactions.length })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(req, createTransactionSchema)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parseResult.error.message,
        },
        { status: 400 },
      )
    }

    const {
      accountId,
      name,
      amount,
      date,
      pending,
      merchantName,
      isoCurrencyCode,
      authorizedDate,
      plaidCategory,
      plaidSubcategory,
      paymentChannel,
      categoryId,
      subcategoryId,
      notes,
      tagIds,
    } = parseResult.data

    // Verify the account exists
    const account = await prisma.plaidAccount.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Generate a unique plaidTransactionId for manual transactions
    // Using "manual_" prefix to distinguish from Plaid IDs
    const plaidTransactionId = `manual_${nanoid()}`

    // Build transaction data object with proper typing
    const transactionData: Prisma.TransactionCreateInput = {
      plaidTransactionId,
      account: {
        connect: { id: accountId },
      },
      name,
      amount: new Prisma.Decimal(amount),
      date: new Date(date),
      datetime: date, // Store as string (ISO format)
      pending,
      merchantName: merchantName || null,
      isoCurrencyCode: isoCurrencyCode || null,
      authorizedDate: authorizedDate ? new Date(authorizedDate) : null,
      authorizedDatetime: authorizedDate || null, // Store as string (ISO format)
      plaidCategory: plaidCategory || null,
      plaidSubcategory: plaidSubcategory || null,
      paymentChannel: paymentChannel || null,
      notes: notes || null,
      isSplit: false,
      isManual: true, // Mark manual transactions
    }

    // Handle category relation
    if (categoryId) {
      transactionData.category = { connect: { id: categoryId } }
    }

    // Handle subcategory relation
    if (subcategoryId) {
      transactionData.subcategory = {
        connect: { id: subcategoryId },
      }
    }

    // Create the transaction
    const newTransaction = await prisma.transaction.create({
      data: transactionData,
    })

    // Handle tags if provided
    if (tagIds && tagIds.length > 0) {
      await prisma.transactionTag.createMany({
        data: tagIds.map((tagId) => ({
          transactionId: newTransaction.id,
          tagId,
        })),
      })
    }

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)

    // Handle unique constraint violation for plaidTransactionId
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "A transaction with this ID already exists" }, { status: 409 })
      }
    }

    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
  }
}
