/**
 * Transaction sync logic for Plaid integration
 */

import { getPlaidClient } from "../api/plaid"
import { prisma } from "../db/prisma"
import { revalidateTag } from "next/cache"
import { logInfo, logError } from "../utils/logger"
import { categorizeTransactions } from "../ai/categorize-transaction"
import { TransactionSyncStats, createTransactionSyncStats } from "./sync-types"
import { buildTransactionData, buildAccountUpsertData, isSplitTransaction } from "./sync-helpers"

// Constants
const HISTORICAL_START_DATE = "2024-01-01"
const TRANSACTION_BATCH_SIZE = 500

/**
 * Syncs banking transactions for a single item
 */
export async function syncItemTransactions(
  itemId: string,
  accessToken: string,
  lastCursor: string | null,
): Promise<{ stats: TransactionSyncStats; newCursor: string }> {
  const plaid = getPlaidClient()
  const stats = createTransactionSyncStats()

  // First, if no cursor exists, do a historical fetch to get older data
  if (!lastCursor) {
    await syncHistoricalTransactions(accessToken, stats)
  }

  // Now use /transactions/sync for incremental updates
  logInfo("  🔄 Syncing incremental updates...")
  let cursor = lastCursor || undefined
  let hasMore = true

  while (hasMore) {
    let resp
    try {
      resp = await plaid.transactionsSync({
        access_token: accessToken,
        cursor: cursor,
        count: TRANSACTION_BATCH_SIZE,
      })
    } catch (error: any) {
      logError("  ❌ Plaid transactionsSync error:", error, {
        errorCode: error.response?.data?.error_code,
        errorMessage: error.response?.data?.error_message,
        cursor: cursor,
      })

      // Update item status if login required
      if (error.response?.data?.error_code === "ITEM_LOGIN_REQUIRED") {
        await prisma.item.update({
          where: { id: itemId },
          data: { status: "ITEM_LOGIN_REQUIRED" },
        })
        revalidateTag("items", "max")
        logError("  ℹ️  Item status updated to ITEM_LOGIN_REQUIRED")
        logError("  ℹ️  Visit /settings/connections to reauthorize")
      }

      throw error
    }

    // Upsert accounts (in case of new/changed)
    for (const a of resp.data.accounts) {
      stats.accountsUpdated++
      const accountData = buildAccountUpsertData(a, itemId)
      await prisma.plaidAccount.upsert({
        where: { plaidAccountId: a.account_id },
        ...accountData,
      })
    }

    // Process added transactions
    await processAddedTransactions(resp.data.added, stats)

    // Process modified transactions
    await processModifiedTransactions(resp.data.modified, stats)

    // Process removed transactions
    await processRemovedTransactions(resp.data.removed, stats)

    cursor = resp.data.next_cursor
    hasMore = resp.data.has_more
  }

  return { stats, newCursor: cursor || "" }
}

/**
 * Fetches and processes historical transactions when no cursor exists
 */
async function syncHistoricalTransactions(accessToken: string, stats: TransactionSyncStats): Promise<void> {
  const plaid = getPlaidClient()
  logInfo("  📅 Fetching historical transactions...")
  const historicalEndDate = new Date().toISOString().slice(0, 10)

  let offset = 0
  const totalTransactions: any[] = []

  // Fetch all historical transactions using pagination
  while (true) {
    const historicalResp = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: HISTORICAL_START_DATE,
      end_date: historicalEndDate,
      options: {
        count: TRANSACTION_BATCH_SIZE,
        offset: offset,
      },
    })

    totalTransactions.push(...historicalResp.data.transactions)

    if (totalTransactions.length >= historicalResp.data.total_transactions) {
      break
    }
    offset += TRANSACTION_BATCH_SIZE
  }

  logInfo(`  ✓ Found ${totalTransactions.length} historical transaction(s)`, {
    transactionCount: totalTransactions.length,
  })

  // Process historical transactions
  for (const t of totalTransactions) {
    // Check if transaction exists by plaidTransactionId OR originalTransactionId (for splits)
    const existing = await prisma.transaction.findFirst({
      where: {
        OR: [
          { plaidTransactionId: t.transaction_id },
          { originalTransactionId: t.transaction_id }, // Match split parents
        ],
      },
    })

    // If split transaction exists, skip it (don't overwrite user's split)
    if (existing && existing.isSplit) {
      logInfo(`    ⏭️  Skipping split: ${t.date} | ${t.datetime} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`, {
        date: t.date,
        name: t.name,
        amount: t.amount,
      })
      continue
    }

    const isNew = !existing
    const transactionData = buildTransactionData(t)

    // Log transaction details
    logInfo(
      `    ${isNew ? "➕ NEW" : "🔄 UPDATE"} [HISTORICAL]\n` +
        `       Date: ${t.date} | Datetime: ${t.datetime} | Account: ${t.account_id}\n` +
        `       Name: ${t.name}\n` +
        `       Amount: ${t.amount} (raw) → ${transactionData.amount.toString()} (stored)\n` +
        `       Pending: ${t.pending} | Currency: ${t.iso_currency_code || "N/A"}\n` +
        `       Category: ${t.personal_finance_category?.primary || "N/A"} / ${t.personal_finance_category?.detailed || "N/A"}`,
      {
        isNew,
        date: t.date,
        datetime: t.datetime,
        accountId: t.account_id,
        name: t.name,
        amount: t.amount,
        pending: t.pending,
        currency: t.iso_currency_code,
        category: t.personal_finance_category?.primary,
        subcategory: t.personal_finance_category?.detailed,
      },
    )

    const upsertedTransaction = await prisma.transaction.upsert({
      where: { plaidTransactionId: existing?.plaidTransactionId || t.transaction_id },
      update: {
        account: { connect: { plaidAccountId: t.account_id } },
        ...transactionData,
      },
      create: {
        plaidTransactionId: t.transaction_id,
        account: { connect: { plaidAccountId: t.account_id } },
        ...transactionData,
      },
      select: { id: true },
    })

    if (isNew) {
      stats.transactionsAdded++
      stats.newTransactionIds.push(upsertedTransaction.id)
    }
  }

  logInfo(`  ✓ Processed ${stats.transactionsAdded} new transaction(s)`, {
    transactionsAdded: stats.transactionsAdded,
  })
}

/**
 * Processes newly added transactions from Plaid sync
 */
async function processAddedTransactions(addedTransactions: any[], stats: TransactionSyncStats): Promise<void> {
  for (const t of addedTransactions) {
    // Check if this matches a split transaction by originalTransactionId
    const existingSplit = await prisma.transaction.findFirst({
      where: {
        originalTransactionId: t.transaction_id,
        isSplit: true,
      },
    })

    if (existingSplit) {
      logInfo(`    ⏭️  Skipping split: ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`, {
        date: t.date,
        name: t.name,
        amount: t.amount,
      })
      continue
    }

    stats.transactionsAdded++
    const transactionData = buildTransactionData(t)

    logInfo(
      `    ➕ NEW [ADDED]\n` +
        `       Date: ${t.date} | Datetime: ${t.datetime} | Account: ${t.account_id}\n` +
        `       Name: ${t.name}\n` +
        `       Amount: ${t.amount} (raw) → ${transactionData.amount.toString()} (stored)\n` +
        `       Pending: ${t.pending} | Currency: ${t.iso_currency_code || "N/A"}\n` +
        `       Category: ${t.personal_finance_category?.primary || "N/A"} / ${t.personal_finance_category?.detailed || "N/A"}`,
      {
        date: t.date,
        datetime: t.datetime,
        accountId: t.account_id,
        name: t.name,
        amount: t.amount,
        pending: t.pending,
        currency: t.iso_currency_code,
        category: t.personal_finance_category?.primary,
        subcategory: t.personal_finance_category?.detailed,
      },
    )

    const upsertedTransaction = await prisma.transaction.upsert({
      where: { plaidTransactionId: t.transaction_id },
      update: {
        account: { connect: { plaidAccountId: t.account_id } },
        ...transactionData,
      },
      create: {
        plaidTransactionId: t.transaction_id,
        account: { connect: { plaidAccountId: t.account_id } },
        ...transactionData,
      },
      select: { id: true },
    })

    stats.newTransactionIds.push(upsertedTransaction.id)
  }
}

/**
 * Processes modified transactions from Plaid sync
 */
async function processModifiedTransactions(modifiedTransactions: any[], stats: TransactionSyncStats): Promise<void> {
  for (const t of modifiedTransactions) {
    // Don't update split transactions (preserve user customization)
    if (await isSplitTransaction(t.transaction_id)) {
      logInfo(`    ⏭️  Skipping split update: ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`, {
        date: t.date,
        name: t.name,
        amount: t.amount,
      })
      continue
    }

    stats.transactionsModified++
    const transactionData = buildTransactionData(t)

    logInfo(
      `    📝 MODIFIED [UPDATE]\n` +
        `       Date: ${t.date} | Datetime: ${t.datetime} | Account: ${t.account_id}\n` +
        `       Name: ${t.name}\n` +
        `       Amount: ${t.amount} (raw) → ${transactionData.amount.toString()} (stored)\n` +
        `       Pending: ${t.pending} | Currency: ${t.iso_currency_code || "N/A"}\n` +
        `       Category: ${t.personal_finance_category?.primary || "N/A"} / ${t.personal_finance_category?.detailed || "N/A"}`,
      {
        date: t.date,
        datetime: t.datetime,
        accountId: t.account_id,
        name: t.name,
        amount: t.amount,
        pending: t.pending,
        currency: t.iso_currency_code,
        category: t.personal_finance_category?.primary,
        subcategory: t.personal_finance_category?.detailed,
      },
    )

    await prisma.transaction.update({
      where: { plaidTransactionId: t.transaction_id },
      data: transactionData,
    })
  }
}

/**
 * Processes removed transactions from Plaid sync
 */
async function processRemovedTransactions(removedTransactions: any[], stats: TransactionSyncStats): Promise<void> {
  const removedIds = removedTransactions.map((r) => r.transaction_id)
  if (removedIds.length) {
    // Don't delete split transactions (preserve user customization)
    const { count } = await prisma.transaction.deleteMany({
      where: {
        plaidTransactionId: { in: removedIds },
        isSplit: false,
        parentTransactionId: null,
      },
    })
    stats.transactionsRemoved += count
    if (count > 0) {
      logInfo(`    🗑️  Removed ${count} transaction(s) (preserved splits)`, { removedCount: count })
    }
  }
}

/**
 * Syncs transactions for a single item and runs AI categorization on new transactions
 * Use this for webhook-triggered syncs where we want categorization included
 */
export async function syncItemTransactionsWithCategorization(
  itemId: string,
  accessToken: string,
  lastCursor: string | null,
): Promise<{ stats: TransactionSyncStats; newCursor: string }> {
  const result = await syncItemTransactions(itemId, accessToken, lastCursor)

  // Run AI categorization on new transactions
  if (result.stats.newTransactionIds.length > 0) {
    logInfo(`🤖 Starting AI categorization for ${result.stats.newTransactionIds.length} new transaction(s)...`, {
      transactionCount: result.stats.newTransactionIds.length,
    })

    try {
      await categorizeTransactions(result.stats.newTransactionIds)
      logInfo(`✅ AI categorization complete for ${result.stats.newTransactionIds.length} transaction(s)`)
    } catch (error) {
      logError(`❌ Error in AI categorization:`, error, {
        transactionCount: result.stats.newTransactionIds.length,
      })
      // Continue even if categorization fails
    }
  }

  return result
}
