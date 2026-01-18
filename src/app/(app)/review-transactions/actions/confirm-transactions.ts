"use server"

import { fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
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

    // Convert to Convex format
    const convexUpdates = validatedUpdates.map((update) => ({
      id: update.id as Id<"transactions">,
      categoryId: update.categoryId as Id<"categories"> | null,
      subcategoryId: update.subcategoryId as Id<"subcategories"> | null,
      notes: update.notes,
      newAmount: update.newAmount,
      tagIds: update.tagIds as Id<"tags">[],
    }))

    // Call Convex mutation
    const result = await fetchMutation(api.transactions.confirmTransactions, {
      updates: convexUpdates,
    })

    // Revalidate transactions cache
    revalidateTag("transactions", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache for all routes

    return {
      success: true,
      updatedCount: result.updatedCount,
    }
  } catch (error) {
    logError("Error confirming transactions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm transactions",
    }
  }
}
