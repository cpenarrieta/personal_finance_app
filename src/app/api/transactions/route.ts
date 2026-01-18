import { NextRequest } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { createTransactionSchema } from "@/types/api"
import { safeParseRequestBody } from "@/types/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

/**
 * GET /api/transactions - Fetch recent transactions
 * Returns last 100 transactions ordered by date (descending)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500) // Max 500

    const transactions = await fetchQuery(api.transactions.getRecent, { limit })

    return apiSuccess({ transactions, count: transactions.length })
  } catch (error) {
    logError("Error fetching transactions:", error)
    return apiErrors.internalError("Failed to fetch transactions")
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate request body with Zod
    const parseResult = await safeParseRequestBody(req, createTransactionSchema)

    if (!parseResult.success) {
      return apiErrors.validationError("Invalid request data", parseResult.error.message)
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
    const account = await fetchQuery(api.accounts.getById, { id: accountId as Id<"accounts"> })

    if (!account) {
      return apiErrors.notFound("Account")
    }

    // Create the transaction using Convex mutation
    const transactionId = await fetchMutation(api.transactions.create, {
      accountId: accountId as Id<"accounts">,
      name,
      amount,
      date,
      pending,
      merchantName: merchantName || undefined,
      isoCurrencyCode: isoCurrencyCode || undefined,
      authorizedDate: authorizedDate || undefined,
      plaidCategory: plaidCategory || undefined,
      plaidSubcategory: plaidSubcategory || undefined,
      paymentChannel: paymentChannel || undefined,
      categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
      subcategoryId: subcategoryId ? (subcategoryId as Id<"subcategories">) : undefined,
      notes: notes || undefined,
      tagIds: tagIds ? (tagIds as Id<"tags">[]) : undefined,
    })

    // Invalidate transaction and dashboard caches
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ id: transactionId }, 201)
  } catch (error) {
    logError("Error creating transaction:", error)

    // Handle duplicate error
    if (error instanceof Error && error.message.includes("already exists")) {
      return apiErrors.conflict("A transaction with this ID already exists")
    }

    return apiErrors.internalError("Failed to create transaction")
  }
}
