/**
 * Transaction split service
 *
 * Shared logic for splitting transactions (manual and AI-powered)
 */

import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/generated"
import { revalidateTag, revalidatePath } from "next/cache"

const Decimal = Prisma.Decimal

export interface BaseSplitItem {
  amount: Prisma.Decimal | number
  categoryId: string | null
  subcategoryId: string | null
  notes: string | null
  description?: string
}

export interface SplitResult {
  original: Prisma.TransactionGetPayload<{}>
  children: Prisma.TransactionGetPayload<{}>[]
}

export interface SplitOptions {
  /** Tag to apply to the split (e.g., "ai-split" for AI-generated splits) */
  tagName?: string
  /** Color for the auto-created tag */
  tagColor?: string
  /** Whether to apply the tag to child transactions */
  applyTagToChildren?: boolean
}

/**
 * Validates that a transaction can be split
 */
export async function validateTransactionForSplit(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    return { valid: false, error: "Transaction not found", transaction: null }
  }

  if (transaction.isSplit) {
    return { valid: false, error: "Transaction has already been split", transaction }
  }

  return { valid: true, error: null, transaction }
}

/**
 * Creates child transactions from a parent transaction
 */
export async function splitTransaction(
  originalId: string,
  splits: BaseSplitItem[],
  options: SplitOptions = {},
): Promise<SplitResult> {
  const { tagName, tagColor = "#8b5cf6", applyTagToChildren = false } = options

  // Fetch the original transaction
  const originalTransaction = await prisma.transaction.findUnique({
    where: { id: originalId },
  })

  if (!originalTransaction) {
    throw new Error("Transaction not found")
  }

  if (originalTransaction.isSplit) {
    throw new Error("Transaction has already been split")
  }

  // Optionally ensure tag exists
  let tag: { id: string } | null = null
  if (tagName) {
    tag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName, color: tagColor },
    })
  }

  // Perform the split in a transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Mark original transaction as split
    const updateData: Prisma.TransactionUpdateInput = { isSplit: true }

    // Optionally add tag to original
    if (tag) {
      updateData.tags = {
        connectOrCreate: {
          where: {
            transactionId_tagId: {
              transactionId: originalId,
              tagId: tag.id,
            },
          },
          create: { tagId: tag.id },
        },
      }
    }

    const updatedOriginal = await tx.transaction.update({
      where: { id: originalId },
      data: updateData,
    })

    // Create child transactions
    const childTransactions = await Promise.all(
      splits.map((split, index) => {
        // Normalize amount to Decimal
        const splitAmount =
          split.amount instanceof Decimal ? split.amount : new Decimal(split.amount.toString())

        // Build child transaction data
        const childData: Prisma.TransactionCreateInput = {
          plaidTransactionId: `${originalTransaction.plaidTransactionId}_split_${index + 1}_${Date.now()}`,
          account: { connect: { id: originalTransaction.accountId } },
          amount: splitAmount,
          isoCurrencyCode: originalTransaction.isoCurrencyCode,
          date: originalTransaction.date,
          datetime: originalTransaction.datetime,
          authorizedDate: originalTransaction.authorizedDate,
          authorizedDatetime: originalTransaction.authorizedDatetime,
          pending: originalTransaction.pending,
          merchantName: originalTransaction.merchantName,
          name: split.description || `${originalTransaction.name} (Split ${index + 1}/${splits.length})`,
          plaidCategory: originalTransaction.plaidCategory,
          plaidSubcategory: originalTransaction.plaidSubcategory,
          paymentChannel: originalTransaction.paymentChannel,
          logoUrl: originalTransaction.logoUrl,
          categoryIconUrl: originalTransaction.categoryIconUrl,
          notes: split.notes,
          parentTransaction: { connect: { id: originalTransaction.id } },
          originalTransactionId: originalTransaction.id,
          isSplit: false,
        }

        // Connect category if provided
        if (split.categoryId) {
          childData.category = { connect: { id: split.categoryId } }
        }

        // Connect subcategory if provided
        if (split.subcategoryId) {
          childData.subcategory = { connect: { id: split.subcategoryId } }
        }

        // Add tag to children if requested
        if (tag && applyTagToChildren) {
          childData.tags = { create: { tagId: tag.id } }
        }

        return tx.transaction.create({ data: childData })
      }),
    )

    return {
      original: updatedOriginal,
      children: childTransactions,
    }
  })

  // Invalidate caches
  revalidateTag("transactions", "max")
  revalidateTag("dashboard", "max")
  revalidatePath("/", "layout")

  return result
}

/**
 * Validates that split amounts sum correctly to original amount
 */
export function validateSplitAmounts(
  originalAmount: Prisma.Decimal,
  splits: { amount: Prisma.Decimal | number }[],
  tolerancePercent: number = 0,
): { valid: boolean; totalSplitAmount: Prisma.Decimal; difference: Prisma.Decimal } {
  const totalSplitAmount = splits.reduce((sum, split) => {
    const amount = split.amount instanceof Decimal ? split.amount : new Decimal(split.amount.toString())
    return sum.add(amount.abs())
  }, new Decimal(0))

  const originalAbsolute = originalAmount.abs()
  const difference = totalSplitAmount.sub(originalAbsolute).abs()

  // Check if within tolerance
  const tolerance = tolerancePercent > 0 ? originalAbsolute.mul(tolerancePercent / 100) : new Decimal(0)

  return {
    valid: difference.lte(tolerance) || difference.equals(new Decimal(0)),
    totalSplitAmount,
    difference,
  }
}
