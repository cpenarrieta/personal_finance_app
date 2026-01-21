/**
 * Sync Service - Main orchestrator for Plaid data synchronization
 * Updated to use Convex instead of Prisma
 *
 * This module coordinates syncing of:
 * - Banking transactions (see sync-transactions.ts)
 * - Investment holdings and transactions (see sync-investments.ts)
 * - AI categorization for new transactions
 */

import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logError } from "../utils/logger"
import { categorizeTransactions } from "../ai/categorize-transaction"
import { SyncStats, SyncOptions, createSyncStats } from "./sync-types"
import { syncItemTransactions } from "./sync-transactions"
import { syncItemInvestments } from "./sync-investments"

// Re-export types and functions for backward compatibility
export * from "./sync-types"
export { syncItemTransactions, syncItemTransactionsWithCategorization } from "./sync-transactions"
export { syncItemInvestments } from "./sync-investments"

/**
 * Generic sync function that can sync transactions and/or investments
 */
export async function syncItems(
  options: SyncOptions = { syncTransactions: true, syncInvestments: true, runAICategorization: true },
) {
  const items = await fetchQuery(api.sync.getAllItems)

  const totalStats = createSyncStats()

  const syncType =
    options.syncTransactions && options.syncInvestments
      ? "full"
      : options.syncTransactions
        ? "transactions"
        : "investments"

  logInfo(`\n🔄 Starting ${syncType} sync for ${items.length} item(s)...\n`, {
    syncType,
    itemCount: items.length,
  })

  for (const item of items) {
    const itemStats = createSyncStats()

    const itemInfo = await fetchQuery(api.sync.getItemWithInstitution, { id: item.id })
    const institutionName = itemInfo?.institution?.name || "Unknown Institution"
    logInfo(`\n📦 Processing: ${institutionName}\n${"─".repeat(60)}`, {
      institutionName,
      itemId: item.id,
    })

    // Sync transactions if requested
    if (options.syncTransactions) {
      const { stats: txStats, newCursor } = await syncItemTransactions(
        item.id,
        item.accessToken,
        item.lastTransactionsCursor,
      )

      Object.assign(itemStats, txStats)

      // Update cursor
      await fetchMutation(api.sync.updateItemCursor, {
        id: item.id,
        lastTransactionsCursor: newCursor,
      })
    }

    // Sync investments if requested
    if (options.syncInvestments) {
      const invStats = await syncItemInvestments(item.id, item.accessToken)
      Object.assign(itemStats, invStats)
    }

    // Update total stats
    accumulateStats(totalStats, itemStats)

    // Print item summary
    printItemSummary(institutionName, itemStats, options)
  }

  // AI categorization for new banking transactions
  if (options.runAICategorization !== false && options.syncTransactions && totalStats.newTransactionIds.length > 0) {
    await runAICategorization(totalStats.newTransactionIds)
  }

  // Invalidate caches based on what was synced
  invalidateCaches(options)

  // Print total summary
  printTotalSummary(syncType, totalStats, options)
}

/**
 * Accumulates stats from item sync into total stats
 */
function accumulateStats(totalStats: SyncStats, itemStats: SyncStats): void {
  totalStats.accountsUpdated += itemStats.accountsUpdated
  totalStats.transactionsAdded += itemStats.transactionsAdded
  totalStats.transactionsModified += itemStats.transactionsModified
  totalStats.transactionsRemoved += itemStats.transactionsRemoved
  totalStats.newTransactionIds.push(...itemStats.newTransactionIds)
  totalStats.securitiesAdded += itemStats.securitiesAdded
  totalStats.holdingsAdded += itemStats.holdingsAdded
  totalStats.holdingsUpdated += itemStats.holdingsUpdated
  totalStats.holdingsRemoved += itemStats.holdingsRemoved
  totalStats.investmentTransactionsAdded += itemStats.investmentTransactionsAdded
}

/**
 * Runs AI categorization for new transactions
 */
async function runAICategorization(transactionIds: string[]): Promise<void> {
  logInfo(`\n🤖 Starting AI categorization for ${transactionIds.length} new transaction(s)...`, {
    transactionCount: transactionIds.length,
  })

  try {
    await categorizeTransactions(transactionIds)
    logInfo(`✅ AI categorization complete for ${transactionIds.length} transaction(s)`)
  } catch (error) {
    logError(`❌ Error in AI categorization:`, error, {
      transactionCount: transactionIds.length,
    })
    // Continue with sync even if categorization fails
  }
}

/**
 * Invalidates caches based on sync options
 */
function invalidateCaches(options: SyncOptions): void {
  logInfo("\n🔄 Invalidating caches...")
  if (options.syncTransactions) {
    revalidateTag("transactions", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout")
    logInfo("  ✓ Invalidated: transactions, accounts, dashboard + Router Cache")
  }
  if (options.syncInvestments) {
    revalidateTag("holdings", "max")
    revalidateTag("investments", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
    revalidatePath("/", "layout")
    logInfo("  ✓ Invalidated: holdings, investments, accounts, dashboard + Router Cache")
  }
}

/**
 * Prints summary for a single item sync
 */
function printItemSummary(institutionName: string, itemStats: SyncStats, options: SyncOptions): void {
  const summaryMessage =
    "\n  ✅ Summary for " +
    institutionName +
    ":" +
    (options.syncTransactions
      ? `\n     • Accounts updated: ${itemStats.accountsUpdated}` +
        `\n     • Transactions added: ${itemStats.transactionsAdded}` +
        `\n     • Transactions modified: ${itemStats.transactionsModified}` +
        `\n     • Transactions removed: ${itemStats.transactionsRemoved}`
      : "") +
    (options.syncInvestments
      ? `\n     • Securities added: ${itemStats.securitiesAdded}` +
        `\n     • Holdings added: ${itemStats.holdingsAdded}` +
        `\n     • Holdings updated: ${itemStats.holdingsUpdated}` +
        `\n     • Holdings removed: ${itemStats.holdingsRemoved}` +
        `\n     • Investment transactions added: ${itemStats.investmentTransactionsAdded}`
      : "")

  logInfo(summaryMessage, {
    institutionName,
    ...itemStats,
  })
}

/**
 * Prints total summary for all synced items
 */
function printTotalSummary(syncType: string, totalStats: SyncStats, options: SyncOptions): void {
  const totalSummaryMessage =
    "\n" +
    "═".repeat(60) +
    `\n📊 ${syncType.toUpperCase()} SYNC COMPLETE - TOTAL SUMMARY\n` +
    "═".repeat(60) +
    (options.syncTransactions
      ? `\n  Accounts updated: ${totalStats.accountsUpdated}` +
        `\n  Transactions added: ${totalStats.transactionsAdded}` +
        `\n  Transactions modified: ${totalStats.transactionsModified}` +
        `\n  Transactions removed: ${totalStats.transactionsRemoved}`
      : "") +
    (options.syncInvestments
      ? `\n  Securities added: ${totalStats.securitiesAdded}` +
        `\n  Holdings added: ${totalStats.holdingsAdded}` +
        `\n  Holdings updated: ${totalStats.holdingsUpdated}` +
        `\n  Holdings removed: ${totalStats.holdingsRemoved}` +
        `\n  Investment transactions added: ${totalStats.investmentTransactionsAdded}`
      : "") +
    "\n" +
    "═".repeat(60) +
    "\n"

  logInfo(totalSummaryMessage, {
    syncType,
    ...totalStats,
  })
}
