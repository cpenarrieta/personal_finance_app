import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { safeParseRequestBody } from "@/types/api"
import { Decimal } from "@prisma/client/runtime/library"
import { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"

// Schema for AI-generated split transaction request
const aiSplitSchema = z.object({
  categoryId: z.string(),
  subcategoryId: z.string().nullable(),
  amount: z.number().positive(),
  description: z.string(),
  reasoning: z.string().optional(),
})

const aiSplitTransactionSchema = z.object({
  splits: z.array(aiSplitSchema).min(1, "At least 1 split is required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate request body
    const parseResult = await safeParseRequestBody(req, aiSplitTransactionSchema)

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

    // Validate that split amounts sum to original amount (with tolerance for rounding)
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)
    const originalAmount = Math.abs(originalTransaction.amount.toNumber())
    const difference = Math.abs(totalSplitAmount - originalAmount)

    if (difference > 0.02) {
      return NextResponse.json(
        {
          error: "Split amounts must sum to original transaction amount",
          details: {
            original: originalAmount.toFixed(2),
            total: totalSplitAmount.toFixed(2),
            difference: difference.toFixed(2),
          },
        },
        { status: 400 },
      )
    }

    // Ensure "ai-split" tag exists
    const aiSplitTag = await prisma.tag.upsert({
      where: { name: "ai-split" },
      update: {},
      create: {
        name: "ai-split",
        color: "#8b5cf6", // Purple color for AI splits
      },
    })

    // Perform the split in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mark original transaction as split
      const updatedOriginal = await tx.transaction.update({
        where: { id },
        data: {
          isSplit: true,
          tags: {
            connectOrCreate: {
              where: {
                transactionId_tagId: {
                  transactionId: id,
                  tagId: aiSplitTag.id,
                },
              },
              create: {
                tagId: aiSplitTag.id,
              },
            },
          },
        },
      })

      // Create child transactions
      const childTransactions = await Promise.all(
        splits.map((split, index) => {
          // Convert amount to Decimal, preserving the negative sign for expenses
          const isExpense = originalTransaction.amount.toNumber() > 0
          const splitAmount = new Decimal(split.amount)
          const signedAmount = isExpense ? splitAmount : splitAmount.mul(-1)

          return tx.transaction.create({
            data: {
              // Generate a unique plaidTransactionId for split children
              plaidTransactionId: `${originalTransaction.plaidTransactionId}_ai_split_${index + 1}_${Date.now()}`,
              accountId: originalTransaction.accountId,
              amount: signedAmount,
              isoCurrencyCode: originalTransaction.isoCurrencyCode,
              date: originalTransaction.date,
              datetime: originalTransaction.datetime,
              authorizedDate: originalTransaction.authorizedDate,
              authorizedDatetime: originalTransaction.authorizedDatetime,
              pending: originalTransaction.pending,
              merchantName: originalTransaction.merchantName,
              name: split.description,
              plaidCategory: originalTransaction.plaidCategory,
              plaidSubcategory: originalTransaction.plaidSubcategory,
              paymentChannel: originalTransaction.paymentChannel,
              logoUrl: originalTransaction.logoUrl,
              categoryIconUrl: originalTransaction.categoryIconUrl,
              categoryId: split.categoryId,
              subcategoryId: split.subcategoryId,
              notes: split.reasoning || null,
              parentTransactionId: originalTransaction.id,
              originalTransactionId: originalTransaction.id,
              isSplit: false,
              tags: {
                create: {
                  tagId: aiSplitTag.id,
                },
              },
            },
          })
        }),
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
      message: "Transaction split successfully with AI suggestions",
      data: result,
    })
  } catch (error) {
    console.error("Error splitting transaction with AI:", error)
    return NextResponse.json({ error: "Failed to split transaction" }, { status: 500 })
  }
}
