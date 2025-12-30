/**
 * Plaid webhook handlers
 *
 * Extracted handlers for different Plaid webhook types
 */

import { prisma } from "@/lib/db/prisma"
import { syncItemTransactionsWithCategorization } from "@/lib/sync/sync-service"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logWarn, logError } from "@/lib/utils/logger"

/**
 * Plaid webhook error type
 */
export interface PlaidWebhookError {
  error_code: string
  error_message: string
}

/**
 * Handle transaction webhook events
 */
export async function handleTransactionWebhook(webhookCode: string, itemId: string): Promise<void> {
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
    // Sync transactions and run AI categorization (handled within syncItemTransactionsWithCategorization)
    const { stats, newCursor } = await syncItemTransactionsWithCategorization(
      item.id,
      item.accessToken,
      item.lastTransactionsCursor,
    )

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

    // Invalidate relevant caches
    revalidateTag("transactions", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")

    // Invalidate Router Cache for all routes (required in Route Handlers)
    revalidatePath("/", "layout")
  } catch (error) {
    logError(`❌ Error syncing transactions:`, error)
    throw error
  }
}

/**
 * Handle item webhook events (errors, login issues, etc.)
 */
export async function handleItemWebhook(
  webhookCode: string,
  itemId: string,
  error?: PlaidWebhookError,
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
      await handleItemError(item.id, error)
      break

    case "PENDING_EXPIRATION":
      await handlePendingExpiration(item.id)
      break

    case "PENDING_DISCONNECT":
      await handlePendingDisconnect(item.id, reason)
      break

    case "LOGIN_REPAIRED":
      await handleLoginRepaired(item.id)
      break

    default:
      logInfo(`ℹ️  Unhandled item webhook code: ${webhookCode}`, { webhookCode, itemId: item.id })
  }
}

/**
 * Handle item error webhook
 */
async function handleItemError(itemId: string, error?: PlaidWebhookError): Promise<void> {
  logError(`❌ Item error:`, error, { itemId, errorCode: error?.error_code })
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "ERROR" },
  })
}

/**
 * Handle pending expiration webhook
 */
async function handlePendingExpiration(itemId: string): Promise<void> {
  logWarn(`⚠️  Item credentials expiring soon`, { itemId })
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "PENDING_EXPIRATION" },
  })
}

/**
 * Handle pending disconnect webhook
 */
async function handlePendingDisconnect(itemId: string, reason?: string): Promise<void> {
  logWarn(`⚠️  Item pending disconnect. Reason: ${reason}`, { itemId, reason })
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "PENDING_DISCONNECT" },
  })
}

/**
 * Handle login repaired webhook
 */
async function handleLoginRepaired(itemId: string): Promise<void> {
  logInfo(`✅ Item login repaired`, { itemId })
  await prisma.item.update({
    where: { id: itemId },
    data: { status: "ACTIVE" },
  })
}

/**
 * Webhook handler registry for easy routing
 */
export const webhookHandlers = {
  TRANSACTIONS: {
    SYNC_UPDATES_AVAILABLE: handleTransactionWebhook,
    DEFAULT_UPDATE: handleTransactionWebhook,
    INITIAL_UPDATE: handleTransactionWebhook,
    HISTORICAL_UPDATE: handleTransactionWebhook,
    TRANSACTIONS_REMOVED: handleTransactionWebhook,
  },
  ITEM: {
    ERROR: handleItemWebhook,
    PENDING_EXPIRATION: handleItemWebhook,
    PENDING_DISCONNECT: handleItemWebhook,
    LOGIN_REPAIRED: handleItemWebhook,
  },
} as const
