"use server"

import { prisma } from "@/lib/db/prisma"
import { revalidateTag, revalidatePath } from "next/cache"
import { z } from "zod"
import { logError } from "@/lib/utils/logger"

const TransactionUpdateSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  notes: z.string().nullable(),
  newAmount: z.number().nullable(), // null means no change, otherwise the new amount (display format)
  tagIds: z.array(z.string()), // Array of tag IDs for this transaction
})

type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>

/**
 * Confirm and save transaction updates
 * - Updates category, subcategory, notes, amount, and tags for selected transactions
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

    // Fetch current transaction tags for all updates
    const currentTransactions = await prisma.transaction.findMany({
      where: { id: { in: validatedUpdates.map((u) => u.id) } },
      select: { id: true, tags: { select: { tagId: true } } },
    })

    type TransactionWithTagIds = (typeof currentTransactions)[0]
    type TransactionTagId = TransactionWithTagIds["tags"][0]

    // Build a map of current tags for quick lookup
    const currentTagsMap = new Map<string, string[]>(
      currentTransactions.map((t: TransactionWithTagIds) => [t.id, t.tags.map((tag: TransactionTagId) => tag.tagId)]),
    )

    // Process all updates in a transaction
    await prisma.$transaction(
      validatedUpdates.map((update) => {
        const currentTagIds: string[] = currentTagsMap.get(update.id) || []
        const tagsToConnect = update.tagIds.filter((tagId: string) => !currentTagIds.includes(tagId))
        const tagsToDisconnect = currentTagIds.filter((tagId: string) => !update.tagIds.includes(tagId))

        // Filter out "for-review" tag from tagsToConnect to avoid re-adding it
        const tagsToConnectFiltered = forReviewTag
          ? tagsToConnect.filter((tagId: string) => tagId !== forReviewTag.id)
          : tagsToConnect

        return prisma.transaction.update({
          where: { id: update.id },
          data: {
            categoryId: update.categoryId,
            subcategoryId: update.subcategoryId,
            notes: update.notes,
            // Update amount if newAmount is provided (convert back to database format: display * -1)
            ...(update.newAmount !== null ? { amount: update.newAmount * -1 } : {}),
            tags: {
              // Remove "for-review" tag if it exists
              ...(forReviewTag
                ? {
                    deleteMany: {
                      tagId: forReviewTag.id,
                    },
                  }
                : {}),
              // Connect new tags
              ...(tagsToConnectFiltered.length > 0
                ? {
                    create: tagsToConnectFiltered.map((tagId: string) => ({
                      tag: { connect: { id: tagId } },
                    })),
                  }
                : {}),
              // Disconnect removed tags (excluding for-review which is already handled)
              ...(tagsToDisconnect.length > 0
                ? {
                    deleteMany: {
                      tagId: {
                        in: forReviewTag
                          ? tagsToDisconnect.filter((tagId: string) => tagId !== forReviewTag.id)
                          : tagsToDisconnect,
                      },
                    },
                  }
                : {}),
            },
          },
        })
      }),
    )

    // Revalidate transactions cache
    revalidateTag("transactions", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache for all routes

    return {
      success: true,
      updatedCount: validatedUpdates.length,
    }
  } catch (error) {
    logError("Error confirming transactions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm transactions",
    }
  }
}
