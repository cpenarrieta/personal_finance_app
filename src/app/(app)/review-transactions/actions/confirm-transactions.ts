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
 * - Removes "for-review" and "sign-review" tags from confirmed transactions
 * - Revalidates transaction cache
 */
export async function confirmTransactions(updates: TransactionUpdate[]) {
  try {
    // Validate all updates
    const validatedUpdates = updates.map((update) => TransactionUpdateSchema.parse(update))

    // Get review tags to remove on confirmation
    const [forReviewTag, signReviewTag] = await Promise.all([
      prisma.tag.findUnique({ where: { name: "for-review" }, select: { id: true } }),
      prisma.tag.findUnique({ where: { name: "sign-review" }, select: { id: true } }),
    ])
    const reviewTagIds = [forReviewTag?.id, signReviewTag?.id].filter((id): id is string => !!id)

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

        // Filter out review tags from tagsToConnect to avoid re-adding them
        const tagsToConnectFiltered = tagsToConnect.filter((tagId: string) => !reviewTagIds.includes(tagId))

        return prisma.transaction.update({
          where: { id: update.id },
          data: {
            categoryId: update.categoryId,
            subcategoryId: update.subcategoryId,
            notes: update.notes,
            // Update amount if newAmount is provided (convert back to database format: display * -1)
            ...(update.newAmount !== null ? { amount: update.newAmount * -1 } : {}),
            tags: {
              // Remove review tags (for-review and sign-review)
              ...(reviewTagIds.length > 0
                ? {
                    deleteMany: {
                      tagId: { in: reviewTagIds },
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
              // Disconnect removed tags (excluding review tags which are already handled)
              ...(tagsToDisconnect.length > 0
                ? {
                    deleteMany: {
                      tagId: {
                        in: tagsToDisconnect.filter((tagId: string) => !reviewTagIds.includes(tagId)),
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
