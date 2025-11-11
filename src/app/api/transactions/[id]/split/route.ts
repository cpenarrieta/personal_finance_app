import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { safeParseRequestBody } from "@/types/api"
import { Decimal } from "@prisma/client/runtime/library"
import { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"

// Schema for split transaction request
const splitTransactionSchema = z.object({
  splits: z
    .array(
      z.object({
        amount: z
          .string()
          .or(z.number())
          .transform((val) => new Decimal(val.toString())),
        categoryId: z.string().optional().nullable(),
        subcategoryId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        description: z.string().optional(), // Optional custom description for the split
      }),
    )
    .min(2, "At least 2 splits are required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate request body
    const parseResult = await safeParseRequestBody(req, splitTransactionSchema)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: parseResult.error.message,
        },
        { status: 400 },
      )
    }

    const { splits } = parseResult.data

    // Fetch the original transaction
    const originalTransaction = await prisma.transaction.findUnique({
      where: { id },
    })

    if (!originalTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Check if transaction is already split
    if (originalTransaction.isSplit) {
      return NextResponse.json({ error: "Transaction has already been split" }, { status: 400 })
    }

    // Validate that split amounts sum to original amount
    const totalSplitAmount = splits.reduce((sum, split) => sum.add(split.amount), new Decimal(0))

    if (!totalSplitAmount.equals(originalTransaction.amount)) {
      return NextResponse.json(
        {
          error: "Split amounts must sum to original transaction amount",
          details: {
            original: originalTransaction.amount.toString(),
            total: totalSplitAmount.toString(),
          },
        },
        { status: 400 },
      )
    }

    // Perform the split in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mark original transaction as split
      const updatedOriginal = await tx.transaction.update({
        where: { id },
        data: { isSplit: true },
      })

      // Create child transactions
      const childTransactions = await Promise.all(
        splits.map((split, index) =>
          tx.transaction.create({
            data: {
              // Generate a unique plaidTransactionId for split children
              plaidTransactionId: `${originalTransaction.plaidTransactionId}_split_${index + 1}_${Date.now()}`,
              accountId: originalTransaction.accountId,
              amount: split.amount,
              isoCurrencyCode: originalTransaction.isoCurrencyCode,
              date: originalTransaction.date,
              authorizedDate: originalTransaction.authorizedDate,
              pending: originalTransaction.pending,
              merchantName: originalTransaction.merchantName,
              name: split.description || `${originalTransaction.name} (Split ${index + 1}/${splits.length})`,
              plaidCategory: originalTransaction.plaidCategory,
              plaidSubcategory: originalTransaction.plaidSubcategory,
              paymentChannel: originalTransaction.paymentChannel,
              logoUrl: originalTransaction.logoUrl,
              categoryIconUrl: originalTransaction.categoryIconUrl,
              categoryId: split.categoryId || null,
              subcategoryId: split.subcategoryId || null,
              notes: split.notes || null,
              parentTransactionId: originalTransaction.id,
              originalTransactionId: originalTransaction.id,
              isSplit: false,
            },
          }),
        ),
      )

      return {
        original: updatedOriginal,
        children: childTransactions,
      }
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")

    return NextResponse.json({
      success: true,
      message: "Transaction split successfully",
      data: result,
    })
  } catch (error) {
    console.error("Error splitting transaction:", error)
    return NextResponse.json({ error: "Failed to split transaction" }, { status: 500 })
  }
}
