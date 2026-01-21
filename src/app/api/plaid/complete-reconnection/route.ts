import { NextRequest } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { revalidateTag, revalidatePath } from "next/cache"
import { getReconnectionData, clearReconnectionData } from "@/lib/cache/reconnection-cache"
import { logInfo, logError } from "@/lib/utils/logger"
import { apiSuccess, apiErrors } from "@/lib/api/response"

/**
 * Completes a reconnection after user confirmation
 * Uses data stored by prepare-exchange to update item and accounts
 */
export async function POST(req: NextRequest) {
  try {
    const { reconnectionId } = await req.json()

    if (!reconnectionId) {
      return apiErrors.badRequest("reconnectionId is required")
    }

    // Get stored reconnection data
    const data = getReconnectionData(reconnectionId)
    if (!data) {
      return apiErrors.notFound("Reconnection data not found or expired")
    }

    const { accessToken, itemId, institutionId, institutionName, accounts, existingItemDbId } = data

    logInfo(`🔄 Completing reconnection for ${institutionName}...`)

    // Upsert institution
    await fetchMutation(api.items.upsertInstitution, {
      oldId: institutionId,
      name: institutionName,
    })

    // STEP 1: Convert split children to manual (preserve user customizations)
    const convertResult = await fetchMutation(api.items.convertSplitChildrenToManual, {
      itemId: existingItemDbId as Id<"items">,
    })

    if (convertResult.converted > 0) {
      logInfo(`   Converted ${convertResult.converted} split children to manual transactions`)
    }

    // STEP 2: Delete old Plaid transactions (including split parents)
    const deleteResult = await fetchMutation(api.items.deleteNonManualTransactions, {
      itemId: existingItemDbId as Id<"items">,
    })
    logInfo(`   Deleted ${deleteResult.deleted} Plaid transactions (preserved manual & split children)`)

    // Update existing item with new access token and plaidItemId
    await fetchMutation(api.items.updateForReconnection, {
      id: existingItemDbId as Id<"items">,
      plaidItemId: itemId,
      accessToken,
      status: "ACTIVE",
    })

    // Get existing accounts
    const existingItem = await fetchQuery(api.items.getById, {
      id: existingItemDbId as Id<"items">,
    })
    const existingAccounts = existingItem?.accounts || []

    // Update existing accounts with new plaidAccountIds
    for (const a of accounts) {
      const accountSignature = `${a.name}|${a.mask}`
      const existingAccount = existingAccounts.find(
        (acc: { name: string; mask?: string | null }) => `${acc.name}|${acc.mask}` === accountSignature,
      )

      if (existingAccount) {
        // Update existing account with new plaidAccountId
        await fetchMutation(api.accounts.updatePlaidAccountId, {
          id: existingAccount._id as Id<"accounts">,
          plaidAccountId: a.account_id,
          officialName: a.official_name || null,
          type: a.type,
          subtype: a.subtype || null,
          currency: a.balances.iso_currency_code || null,
          currentBalance: a.balances.current ?? null,
          availableBalance: a.balances.available ?? null,
          creditLimit: a.balances.limit ?? null,
        })
      } else {
        // New account - create it
        await fetchMutation(api.accounts.create, {
          plaidAccountId: a.account_id,
          itemId: existingItemDbId as Id<"items">,
          name: a.name ?? a.official_name ?? "Account",
          officialName: a.official_name || null,
          mask: a.mask || null,
          type: a.type,
          subtype: a.subtype || null,
          currency: a.balances.iso_currency_code || null,
          currentBalance: a.balances.current ?? null,
          availableBalance: a.balances.available ?? null,
          creditLimit: a.balances.limit ?? null,
        })
      }
    }

    // Clear stored data
    clearReconnectionData(reconnectionId)

    // Invalidate caches
    revalidateTag("accounts", "max")
    revalidateTag("items", "max")
    revalidateTag("transactions", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    logInfo(`✅ Reconnection complete for ${institutionName}`)

    return apiSuccess({ transactionsDeleted: deleteResult.deleted })
  } catch (error) {
    logError("❌ Error completing reconnection:", error)
    return apiErrors.internalError(error instanceof Error ? error.message : "Unknown error")
  }
}
