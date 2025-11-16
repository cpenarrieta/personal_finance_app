"use server"

import { prisma } from "@/lib/db/prisma"
import { revalidateTag } from "next/cache"
import { z } from "zod"

const TransactionUpdateSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  notes: z.string().nullable(),
})

type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>

/**
 * Confirm and save transaction updates
 * - Updates category, subcategory, and notes for selected transactions
 * - Removes "for-review" tag from confirmed transactions
 * - Revalidates transaction cache
 */
export async function confirmTransactions(updates: TransactionUpdate[]) {
  try {
    // Validate all updates
    const validatedUpdates = updates.map((update) => TransactionUpdateSchema.parse(update))

    // Get the "for-review" tag
    const forReviewTag = await prisma.tag.findUnique({
      where: { name: "for-review" },
      select: { id: true },
    })

    // Process all updates in a transaction
    await prisma.$transaction(
      validatedUpdates.map((update) =>
        prisma.transaction.update({
          where: { id: update.id },
          data: {
            categoryId: update.categoryId,
            subcategoryId: update.subcategoryId,
            notes: update.notes,
            // Remove "for-review" tag if it exists
            ...(forReviewTag
              ? {
                  tags: {
                    deleteMany: {
                      tagId: forReviewTag.id,
                    },
                  },
                }
              : {}),
          },
        }),
      ),
    )

    // Revalidate transactions cache
    revalidateTag("transactions", "max")

    return {
      success: true,
      updatedCount: validatedUpdates.length,
    }
  } catch (error) {
    console.error("Error confirming transactions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm transactions",
    }
  }
}
