import { NextRequest } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"
import { CountryCode } from "plaid"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"
import { safeParseRequestBody, exchangePublicTokenSchema } from "@/types/api"
import { apiSuccess, apiErrors } from "@/lib/api/response"

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const parseResult = await safeParseRequestBody(req, exchangePublicTokenSchema)
    if (!parseResult.success) {
      return apiErrors.validationError("Invalid request data", parseResult.error.message)
    }

    const { public_token } = parseResult.data
    const plaid = getPlaidClient()

    const exchange = await plaid.itemPublicTokenExchange({ public_token })
    const accessToken = exchange.data.access_token
    const itemId = exchange.data.item_id

    // Fetch institution info & accounts
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

    // Upsert Institution
    const institutionId = await fetchMutation(api.items.upsertInstitution, {
      oldId: instId,
      name: institutionName,
    })

    // Check for existing item with same institution (reconnection scenario)
    const existingItemForInstitution = await fetchQuery(api.items.getByInstitutionId, {
      institutionId,
    })

    // Get accounts from Plaid
    const accts = await plaid.accountsGet({ access_token: accessToken })

    // If reconnecting (new itemId but same institution), update existing item
    if (existingItemForInstitution && existingItemForInstitution.plaidItemId !== itemId) {
      logInfo(`Reconnection detected for ${institutionName}. Updating existing item...`, {
        institutionName,
        institutionId,
        oldItemId: existingItemForInstitution.plaidItemId,
        newItemId: itemId,
      })

      // Check if accounts match (by name + mask)
      const newAccountSignatures = new Set(accts.data.accounts.map((a) => `${a.name}|${a.mask}`))
      const existingAccountSignatures = new Set(
        existingItemForInstitution.accounts.map((a: { name: string; mask?: string | null }) => `${a.name}|${a.mask}`),
      )

      const matchingAccounts = [...newAccountSignatures].filter((sig) => existingAccountSignatures.has(sig))

      if (matchingAccounts.length > 0) {
        // Same accounts detected - this is a reconnection
        logWarn(`⚠️  Reconnection: Deleting old transactions (Plaid will assign new IDs)...`, {
          institutionName,
          matchingAccountsCount: matchingAccounts.length,
        })

        // STEP 1: Convert split children to manual (preserve user customizations)
        const convertResult = await fetchMutation(api.items.convertSplitChildrenToManual, {
          itemId: existingItemForInstitution.id as Id<"items">,
        })

        if (convertResult.converted > 0) {
          logInfo(`   Converted ${convertResult.converted} split children to manual transactions`, {
            institutionName,
            convertedCount: convertResult.converted,
          })
        }

        // STEP 2: Delete old Plaid transactions (including split parents)
        const deleteResult = await fetchMutation(api.items.deleteNonManualTransactions, {
          itemId: existingItemForInstitution.id as Id<"items">,
        })
        logInfo(`   Deleted ${deleteResult.deleted} Plaid transactions (preserved manual & split children)`, {
          institutionName,
          deletedCount: deleteResult.deleted,
        })

        // Update existing item with new access token and plaidItemId
        await fetchMutation(api.items.updateForReconnection, {
          id: existingItemForInstitution.id as Id<"items">,
          plaidItemId: itemId,
          accessToken,
          status: null,
        })

        // Update existing accounts with new plaidAccountIds
        for (const a of accts.data.accounts) {
          const accountSignature = `${a.name}|${a.mask}`
          const existingAccount = existingItemForInstitution.accounts.find(
            (acc: { name: string; mask?: string | null }) => `${acc.name}|${acc.mask}` === accountSignature,
          )

          if (existingAccount) {
            // Update existing account with new plaidAccountId
            await fetchMutation(api.accounts.updatePlaidAccountId, {
              id: existingAccount.id as Id<"accounts">,
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
              itemId: existingItemForInstitution.id as Id<"items">,
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

        // Invalidate caches
        revalidateTag("accounts", "max")
        revalidateTag("items", "max")
        revalidatePath("/", "layout") // Invalidate Router Cache

        return apiSuccess({ reconnected: true })
      }
    }

    // Normal flow: new institution or no matching accounts
    const dbItemId = await fetchMutation(api.items.upsert, {
      plaidItemId: itemId,
      accessToken,
      institutionId,
      status: null,
    })

    // Accounts
    for (const a of accts.data.accounts) {
      await fetchMutation(api.accounts.upsert, {
        plaidAccountId: a.account_id,
        itemId: dbItemId,
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

    // Invalidate caches so UI updates immediately
    revalidateTag("accounts", "max")
    revalidateTag("items", "max")
    revalidatePath("/", "layout") // Invalidate Router Cache

    return apiSuccess({ reconnected: false })
  } catch (error) {
    logError("Error exchanging public token:", error)
    return apiErrors.internalError("Failed to exchange public token")
  }
}
