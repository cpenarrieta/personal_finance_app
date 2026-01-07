import { NextRequest } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/generated"
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
    await prisma.institution.upsert({
      where: { id: institutionId },
      update: { name: institutionName },
      create: { id: institutionId, name: institutionName },
    })

    // STEP 1: Convert split children to manual (preserve user customizations)
    // This orphans them (removes parent link) before we delete the parent
    const convertedSplits = await prisma.transaction.updateMany({
      where: {
        account: { itemId: existingItemDbId },
        parentTransactionId: { not: null }, // Is a split child
        isManual: false, // Not already manual
      },
      data: {
        isManual: true, // Mark as manual to preserve
        parentTransactionId: null, // Orphan (parent will be deleted)
      },
    })

    if (convertedSplits.count > 0) {
      logInfo(`   Converted ${convertedSplits.count} split children to manual transactions`)
    }

    // STEP 2: Delete old Plaid transactions (including split parents)
    const deletedTxs = await prisma.transaction.deleteMany({
      where: {
        account: { itemId: existingItemDbId },
        isManual: false, // Only delete Plaid-sourced transactions
      },
    })
    logInfo(`   Deleted ${deletedTxs.count} Plaid transactions (preserved manual & split children)`)

    // Update existing item with new access token and plaidItemId
    await prisma.item.update({
      where: { id: existingItemDbId },
      data: {
        plaidItemId: itemId,
        accessToken,
        status: "ACTIVE",
        lastTransactionsCursor: null,
        lastInvestmentsCursor: null,
      },
    })

    // Get existing accounts
    const existingAccounts = await prisma.plaidAccount.findMany({
      where: { itemId: existingItemDbId },
    })

    // Update existing accounts with new plaidAccountIds
    for (const a of accounts) {
      const accountSignature = `${a.name}|${a.mask}`
      const existingAccount = existingAccounts.find(
        (acc: { name: string; mask: string | null }) => `${acc.name}|${acc.mask}` === accountSignature,
      )

      if (existingAccount) {
        // Update existing account with new plaidAccountId
        await prisma.plaidAccount.update({
          where: { id: existingAccount.id },
          data: {
            plaidAccountId: a.account_id,
            officialName: a.official_name || null,
            type: a.type,
            subtype: a.subtype || null,
            currency: a.balances.iso_currency_code || null,
            currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
            availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
            creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
            balanceUpdatedAt: new Date(),
          },
        })
      } else {
        // New account - create it
        await prisma.plaidAccount.create({
          data: {
            plaidAccountId: a.account_id,
            itemId: existingItemDbId,
            name: a.name ?? a.official_name ?? "Account",
            officialName: a.official_name || null,
            mask: a.mask || null,
            type: a.type,
            subtype: a.subtype || null,
            currency: a.balances.iso_currency_code || null,
            currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
            availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
            creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
            balanceUpdatedAt: new Date(),
          },
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

    return apiSuccess({ transactionsDeleted: deletedTxs.count })
  } catch (error) {
    logError("❌ Error completing reconnection:", error)
    return apiErrors.internalError(error instanceof Error ? error.message : "Unknown error")
  }
}
