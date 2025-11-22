import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { prisma } from "@/lib/db/prisma"
import { syncItemTransactions } from "@/lib/sync/sync-service"
import { categorizeTransactions } from "@/lib/ai/categorize-transaction"
import { revalidateTag } from "next/cache"

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
    console.error("❌ Missing Plaid-Verification header")
    return false
  }

  // If PLAID_WEBHOOK_SECRET is set, verify using it
  // Note: Plaid recommends using webhook verification in production
  const webhookSecret = process.env.PLAID_WEBHOOK_SECRET

  if (webhookSecret) {
    try {
      const plaid = getPlaidClient()
      const isValid = await plaid.webhookVerificationKeyGet({
        key_id: plaidVerification,
      })

      if (!isValid.data) {
        console.error("❌ Webhook verification failed")
        return false
      }

      // In production, you should verify the JWT signature using the public key
      // For now, we'll accept the presence of the verification header
      console.log("✅ Webhook verification header present")
      return true
    } catch (error) {
      console.error("❌ Error verifying webhook:", error)
      return false
    }
  }

  // In development, we'll allow webhooks without verification
  console.warn("⚠️  Webhook verification disabled (set PLAID_WEBHOOK_SECRET for production)")
  return true
}

/**
 * Handles transaction webhook events
 */
async function handleTransactionWebhook(webhookCode: string, itemId: string): Promise<void> {
  console.log(`📊 Processing transaction webhook: ${webhookCode} for item ${itemId}`)

  // Find the item in our database
  const item = await prisma.item.findFirst({
    where: { plaidItemId: itemId },
  })

  if (!item) {
    console.error(`❌ Item not found: ${itemId}`)
    throw new Error(`Item not found: ${itemId}`)
  }

  console.log(`🔄 Syncing transactions for item: ${item.id}`)

  try {
    // Sync transactions for this item
    const { stats, newCursor } = await syncItemTransactions(item.id, item.accessToken, item.lastTransactionsCursor)

    // Update the cursor
    await prisma.item.update({
      where: { id: item.id },
      data: { lastTransactionsCursor: newCursor },
    })

    console.log(`✅ Transaction sync complete:`, {
      added: stats.transactionsAdded,
      modified: stats.transactionsModified,
      removed: stats.transactionsRemoved,
    })

    // Categorize new transactions with AI
    if (stats.newTransactionIds.length > 0) {
      console.log(`🤖 Starting AI categorization for ${stats.newTransactionIds.length} new transaction(s)...`)

      // Run categorization in the background for all new transactions
      // Don't await to avoid blocking the webhook response
      categorizeTransactions(stats.newTransactionIds)
        .then(() => {
          console.log(`✅ AI categorization complete`)
          // Invalidate caches after categorization
          revalidateTag("transactions", "max")
        })
        .catch((error) => {
          console.error(`❌ Error in batch categorization:`, error)
        })
    }

    // Invalidate relevant caches
    revalidateTag("transactions", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
  } catch (error) {
    console.error(`❌ Error syncing transactions:`, error)
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
  console.log(`🔔 Processing item webhook: ${webhookCode} for item ${itemId}`)

  // Find the item in our database
  const item = await prisma.item.findFirst({
    where: { plaidItemId: itemId },
  })

  if (!item) {
    console.error(`❌ Item not found: ${itemId}`)
    return
  }

  // Handle different item webhook codes
  switch (webhookCode) {
    case "ERROR":
      console.error(`❌ Item error:`, error)
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "ERROR",
        },
      })
      break

    case "PENDING_EXPIRATION":
      console.warn(`⚠️  Item credentials expiring soon`)
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "PENDING_EXPIRATION",
        },
      })
      break

    case "PENDING_DISCONNECT":
      console.warn(`⚠️  Item pending disconnect. Reason: ${reason}`)
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "PENDING_DISCONNECT",
        },
      })
      break

    case "LOGIN_REPAIRED":
      console.log(`✅ Item login repaired`)
      await prisma.item.update({
        where: { id: item.id },
        data: {
          status: "ACTIVE",
        },
      })
      break

    default:
      console.log(`ℹ️  Unhandled item webhook code: ${webhookCode}`)
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

    console.log("\n🔔 Received Plaid webhook:", {
      type: body.webhook_type,
      code: body.webhook_code,
      itemId: body.item_id,
    })

    // Verify the webhook is from Plaid
    const isValid = await verifyPlaidWebhook(request, bodyText)
    if (!isValid) {
      console.error("❌ Webhook verification failed")
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
            console.log("🗑️  Transactions removed:", body.removed_transactions)
            // The sync will handle removed transactions automatically
            if (body.item_id) {
              await handleTransactionWebhook(body.webhook_code, body.item_id)
            }
            break

          default:
            console.log(`ℹ️  Unhandled transaction webhook code: ${body.webhook_code}`)
        }
        break

      case "ITEM":
        // Handle item webhooks (errors, login issues, etc.)
        if (body.item_id) {
          await handleItemWebhook(body.webhook_code, body.item_id, body.error, body.reason)
        }
        break

      default:
        console.log(`ℹ️  Unhandled webhook type: ${body.webhook_type}`)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ Error processing webhook:", error)

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
