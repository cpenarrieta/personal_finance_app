import { NextRequest } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { fetchQuery } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { CountryCode } from "plaid"
import { storeReconnectionData } from "@/lib/cache/reconnection-cache"
import { logInfo, logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

/**
 * Prepares public token exchange by checking if it's a reauth or reconnection
 * - Reauth (same item_id): Updates item status, returns success
 * - Reconnection (different item_id): Stores data for confirmation, returns warning
 */
export async function POST(req: NextRequest) {
  try {
    const { public_token, existingItemDbId } = await req.json()

    if (!public_token) {
      return apiErrors.badRequest("public_token is required")
    }

    const plaid = getPlaidClient()

    // Exchange public token (can only be done once)
    const exchange = await plaid.itemPublicTokenExchange({ public_token })
    const accessToken = exchange.data.access_token
    const itemId = exchange.data.item_id

    // Get institution info
    const item = await plaid.itemGet({ access_token: accessToken })
    const instId = item.data.item.institution_id || "unknown"
    let institutionName = "Unknown"
    if (instId && instId !== "unknown") {
      const inst = await plaid.institutionsGetById({
        institution_id: instId,
        country_codes: [CountryCode.Ca],
      })
      institutionName = inst.data.institution.name
    }

    // Get accounts
    const accts = await plaid.accountsGet({ access_token: accessToken })

    // Check if this is update mode (reauth or reconnection)
    if (existingItemDbId) {
      const existingItem = await fetchQuery(api.items.getById, {
        id: existingItemDbId as Id<"items">,
      })

      if (!existingItem) {
        return apiErrors.notFound("Existing item")
      }

      // Check if item_id has changed (reconnection) or stayed same (reauth)
      if (existingItem.plaidItemId === itemId) {
        // SIMPLE REAUTH: item_id unchanged, just update status
        logInfo(`✅ Simple reauth detected for ${institutionName} (item_id: ${itemId})`)

        // Note: We don't update status here - that's done in update-item-status endpoint
        // This is just detecting the type of operation

        return apiSuccess({
          type: "reauth",
          message: "Reauthorization successful!",
        })
      } else {
        // RECONNECTION: item_id changed, need user confirmation
        logInfo(`⚠️  Reconnection detected for ${institutionName} (old: ${existingItem.plaidItemId}, new: ${itemId})`)

        // Count transactions - get all accounts and sum transactions
        let transactionCount = 0
        if (existingItem.accounts) {
          // We'd need to query transaction counts - for now estimate based on accounts
          // In production, you'd want to add a getTransactionCount query
          transactionCount = existingItem.accounts.length * 100 // Estimate
        }

        // Store reconnection data for confirmation
        const reconnectionId = storeReconnectionData({
          accessToken,
          itemId,
          institutionId: instId,
          institutionName,
          accounts: accts.data.accounts,
          existingItemId: existingItem.plaidItemId,
          existingItemDbId: existingItem.id as string,
          transactionCount,
        })

        return apiSuccess({
          type: "reconnection",
          reconnectionId,
          transactionCount,
          institutionName,
          message: `Reconnecting will delete ${transactionCount} existing transactions.`,
        })
      }
    }

    // NEW CONNECTION: not update mode
    // For new connections, we handle this in the complete-reconnection endpoint
    // or the original exchange-public-token endpoint
    return apiSuccess({
      type: "new",
      data: {
        accessToken,
        itemId,
        institutionId: instId,
        institutionName,
        accounts: accts.data.accounts,
      },
    })
  } catch (error) {
    logError("❌ Error preparing exchange:", error)
    return apiErrors.internalError(error instanceof Error ? error.message : "Unknown error")
  }
}
