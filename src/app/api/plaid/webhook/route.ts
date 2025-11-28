import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { prisma } from "@/lib/db/prisma"
import { syncItemTransactions } from "@/lib/sync/sync-service"
import { categorizeTransactions } from "@/lib/ai/categorize-transaction"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"

// Plaid webhook types
interface PlaidWebhook {
  webhook_type: string
  webhook_code: string
  item_id?: string
  error?: {
    error_code: string
    error_message: string
  }
  new_transactions?: number
  removed_transactions?: string[]
  reason?: string // For PENDING_DISCONNECT
}

/**
 * Verifies that the webhook request is from Plaid
 */
async function verifyPlaidWebhook(request: NextRequest, _body: string): Promise<boolean> {
  // Get the verification header from Plaid
  const plaidVerification = request.headers.get("plaid-verification")

  if (!plaidVerification) {
    logError("❌ Missing Plaid-Verification header")
    return false
  }

  // If no webhook verification key is configured, skip verification but log a warning
  if (!process.env.PLAID_WEBHOOK_VERIFICATION_KEY) {
    logWarn("⚠️  Webhook verification disabled (set PLAID_WEBHOOK_VERIFICATION_KEY for production)")
    return true
  }

  try {
    // Extract the kid from the JWT header
    // JWT format: header.payload.signature
    const jwtParts = plaidVerification.split(".")
    if (jwtParts.length !== 3 || !jwtParts[0]) {
      logError("❌ Invalid JWT format")
      return false
    }

    // Decode the header (first part) from base64
    const headerJson = Buffer.from(jwtParts[0], "base64").toString("utf-8")
    const header = JSON.parse(headerJson) as { kid?: string }
    const keyId = header.kid

    if (!keyId) {
      logError("❌ Missing kid in JWT header")
      return false
    }

    const plaid = getPlaidClient()
    const isValid = await plaid.webhookVerificationKeyGet({
      key_id: keyId,
    })

    if (!isValid.data) {
      logError("❌ Webhook verification failed")
      return false
    }

    // In production, you should verify the JWT signature using the public key
    // For now, we'll accept the presence of the verification header
    logInfo("✅ Webhook verification header present")
    return true
  } catch (error) {
    logError("❌ Error verifying webhook:", error)
    return false
  }
}

/**
 * Handles transaction webhook events
 */
async function handleTransactionWebhook(webhookCode: string, itemId: string): Promise<void> {
  logInfo(`📊 Processing transaction webhook: ${webhookCode} for item ${itemId}`, {
    webhookCode,
    itemId,
  })

  // Find the item in our database
  const item = await prisma.item.findFirst({
    where: { plaidItemId: itemId },
  })

  if (!item) {
    logError(`❌ Item not found: ${itemId}`, undefined, { itemId })
    throw new Error(`Item not found: ${itemId}`)
  }

  logInfo(`🔄 Syncing transactions for item: ${item.id}`, { itemId: item.id })

  try {
    // Sync transactions for this item
    const { stats, newCursor } = await syncItemTransactions(item.id, item.accessToken, item.lastTransactionsCursor)

    // Update the cursor
    await prisma.item.update({
      where: { id: item.id },
      data: { lastTransactionsCursor: newCursor },
    })

    logInfo(`✅ Transaction sync complete`, {
      added: stats.transactionsAdded,
      modified: stats.transactionsModified,
      removed: stats.transactionsRemoved,
    })

    // Categorize new transactions with AI
    if (stats.newTransactionIds.length > 0) {
      logInfo(`🤖 Starting AI categorization for ${stats.newTransactionIds.length} new transaction(s)...`, {
        transactionCount: stats.newTransactionIds.length,
      })

      // Run categorization in the background for all new transactions
      // Don't await to avoid blocking the webhook response
      categorizeTransactions(stats.newTransactionIds)
        .then(() => {
          logInfo(`✅ AI categorization complete`)
          // Invalidate caches after categorization
          revalidateTag("transactions", "max")
          revalidatePath("/", "layout") // Invalidate Router Cache for all routes
        })
        .catch((error) => {
          logError(`❌ Error in batch categorization:`, error)
        })
    }

    // Invalidate relevant caches
    revalidateTag("transactions", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")

    // Invalidate Router Cache for all routes (required in Route Handlers)
    // In Route Handlers, revalidateTag only invalidates Data Cache, not Router Cache
    // See: https://nextjs.org/docs/app/guides/caching#data-cache-and-client-side-router-cache
    revalidatePath("/", "layout")
  } catch (error) {
    logError(`❌ Error syncing transactions:`, error)
    throw error
  }
}

/**
 * Handles item webhook events
 */
async function handleItemWebhook(
  webhookCode: string,
  itemId: string,
  error?: PlaidWebhook["error"],
  reason?: string,
): Promise<void> {
  logInfo(`🔔 Processing item webhook: ${webhookCode} for item ${itemId}`, {
    webhookCode,
    itemId,
  })

  // Find the item in our database
  const item = await prisma.item.findFirst({
    where: { plaidItemId: itemId },
  })

  if (!item) {
    logError(`❌ Item not found: ${itemId}`, undefined, { itemId })
    return
  }

  // Handle different item webhook codes
  switch (webhookCode) {
    case "ERROR":
      logError(`❌ Item error:`, error, { itemId: item.id, errorCode: error?.error_code })
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "ERROR",
        },
      })
      break

    case "PENDING_EXPIRATION":
      logWarn(`⚠️  Item credentials expiring soon`, { itemId: item.id })
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "PENDING_EXPIRATION",
        },
      })
      break

    case "PENDING_DISCONNECT":
      logWarn(`⚠️  Item pending disconnect. Reason: ${reason}`, { itemId: item.id, reason })
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "PENDING_DISCONNECT",
        },
      })
      break

    case "LOGIN_REPAIRED":
      logInfo(`✅ Item login repaired`, { itemId: item.id })
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "ACTIVE",
        },
      })
      break

    default:
      logInfo(`ℹ️  Unhandled item webhook code: ${webhookCode}`, { webhookCode, itemId: item.id })
  }
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for verification
    const bodyText = await request.text()
    const body: PlaidWebhook = JSON.parse(bodyText)

    logInfo("\n🔔 Received Plaid webhook:", {
      type: body.webhook_type,
      code: body.webhook_code,
      itemId: body.item_id,
    })

    // Verify the webhook is from Plaid
    const isValid = await verifyPlaidWebhook(request, bodyText)
    if (!isValid) {
      logError("❌ Webhook verification failed")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle different webhook types
    switch (body.webhook_type) {
      case "TRANSACTIONS":
        // Handle transaction webhooks
        switch (body.webhook_code) {
          case "SYNC_UPDATES_AVAILABLE":
          case "DEFAULT_UPDATE":
          case "INITIAL_UPDATE":
          case "HISTORICAL_UPDATE":
            if (body.item_id) {
              await handleTransactionWebhook(body.webhook_code, body.item_id)
            }
            break

          case "TRANSACTIONS_REMOVED":
            logInfo("🗑️  Transactions removed:", { removedTransactions: body.removed_transactions })
            // The sync will handle removed transactions automatically
            if (body.item_id) {
              await handleTransactionWebhook(body.webhook_code, body.item_id)
            }
            break

          default:
            logInfo(`ℹ️  Unhandled transaction webhook code: ${body.webhook_code}`, {
              webhookCode: body.webhook_code,
            })
        }
        break

      case "ITEM":
        // Handle item webhooks (errors, login issues, etc.)
        if (body.item_id) {
          await handleItemWebhook(body.webhook_code, body.item_id, body.error, body.reason)
        }
        break

      default:
        logInfo(`ℹ️  Unhandled webhook type: ${body.webhook_type}`, { webhookType: body.webhook_type })
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    logError("❌ Error processing webhook:", error)

    // Return 200 anyway to prevent Plaid from retrying
    // Log the error for investigation
    return NextResponse.json(
      {
        received: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 },
    )
  }
}
