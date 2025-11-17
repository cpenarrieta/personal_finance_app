/**
 * Split transaction creation logic
 * Creates child transactions from receipt line items
 */

import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"

export interface SplitTransactionItem {
  description: string
  amount: number
  categoryId: string | null
  subcategoryId: string | null
}

/**
 * Create split transactions from receipt line items
 * @param parentTransactionId - ID of the original transaction to split
 * @param lineItems - Array of line items to create child transactions for
 */
export async function createSplitTransactions(
  parentTransactionId: string,
  lineItems: SplitTransactionItem[],
): Promise<{ parentId: string; childIds: string[] }> {
  try {
    // Fetch the parent transaction
    const parentTransaction = await prisma.transaction.findUnique({
      where: { id: parentTransactionId },
      include: {
        account: true,
      },
    })

    if (!parentTransaction) {
      throw new Error(`Transaction ${parentTransactionId} not found`)
    }

    if (parentTransaction.isSplit) {
      throw new Error("Transaction is already split")
    }

    if (parentTransaction.parentTransactionId) {
      throw new Error("Cannot split a child transaction")
    }

    // Validate line items
    if (lineItems.length === 0) {
      throw new Error("At least one line item is required")
    }

    // Calculate total from line items
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const parentTotal = Math.abs(parentTransaction.amount.toNumber())
    const totalDiff = Math.abs(lineItemsTotal - parentTotal)
    const totalDiffPercent = (totalDiff / parentTotal) * 100

    // Warn if totals don't match closely
    if (totalDiffPercent > 5) {
      console.warn(
        `⚠️  Split items total ($${lineItemsTotal.toFixed(2)}) differs from parent amount ($${parentTotal.toFixed(2)}) by ${totalDiffPercent.toFixed(1)}%`,
      )
    }

    console.log(`🔀 Splitting transaction ${parentTransactionId} into ${lineItems.length} child transactions`)

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Mark parent as split
      await tx.transaction.update({
        where: { id: parentTransactionId },
        data: { isSplit: true },
      })

      // Create child transactions
      const childIds: string[] = []

      for (const item of lineItems) {
        // Convert amount to negative for expenses (matching Plaid's convention)
        const childAmount = -Math.abs(item.amount)

        const child = await tx.transaction.create({
          data: {
            plaidTransactionId: `manual-split-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            accountId: parentTransaction.accountId,
            amount: new Prisma.Decimal(childAmount),
            isoCurrencyCode: parentTransaction.isoCurrencyCode,
            date: parentTransaction.date,
            authorizedDate: parentTransaction.authorizedDate,
            datetime: parentTransaction.datetime,
            authorizedDatetime: parentTransaction.authorizedDatetime,
            pending: parentTransaction.pending,
            merchantName: parentTransaction.merchantName,
            name: item.description,
            plaidCategory: parentTransaction.plaidCategory,
            plaidSubcategory: parentTransaction.plaidSubcategory,
            paymentChannel: parentTransaction.paymentChannel,
            categoryId: item.categoryId,
            subcategoryId: item.subcategoryId,
            isSplit: false,
            isManual: true,
            parentTransactionId: parentTransactionId,
            originalTransactionId: parentTransactionId,
          },
        })

        childIds.push(child.id)
        console.log(`  ✓ Created child transaction: ${item.description} ($${item.amount.toFixed(2)})`)
      }

      return { parentId: parentTransactionId, childIds }
    })

    // Revalidate caches
    revalidateTag("transactions")
    revalidateTag("categories")
    revalidateTag("tags")

    console.log(`✅ Successfully split transaction into ${result.childIds.length} child transactions`)

    return result
  } catch (error) {
    console.error("Error creating split transactions:", error)
    throw error
  }
}

/**
 * Undo a split transaction (delete child transactions and mark parent as not split)
 * @param parentTransactionId - ID of the parent transaction
 */
export async function undoSplitTransaction(parentTransactionId: string): Promise<void> {
  try {
    const parentTransaction = await prisma.transaction.findUnique({
      where: { id: parentTransactionId },
      include: {
        childTransactions: true,
      },
    })

    if (!parentTransaction) {
      throw new Error(`Transaction ${parentTransactionId} not found`)
    }

    if (!parentTransaction.isSplit) {
      throw new Error("Transaction is not split")
    }

    console.log(`↩️  Undoing split for transaction ${parentTransactionId}`)

    await prisma.$transaction(async (tx) => {
      // Delete all child transactions
      await tx.transaction.deleteMany({
        where: { parentTransactionId },
      })

      // Mark parent as not split
      await tx.transaction.update({
        where: { id: parentTransactionId },
        data: { isSplit: false },
      })
    })

    // Revalidate caches
    revalidateTag("transactions")
    revalidateTag("categories")

    console.log(`✅ Successfully undid split transaction`)
  } catch (error) {
    console.error("Error undoing split transaction:", error)
    throw error
  }
}
