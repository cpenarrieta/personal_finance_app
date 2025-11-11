// lib/sync-service.ts
// Modular sync service that can sync transactions and/or investments separately

import { PlaidAccountWithRelations } from "@/types"
import { getPlaidClient } from "../api/plaid"
import { prisma } from "../db/prisma"
import { Prisma } from "@prisma/client"
import { revalidateTag } from "next/cache"

// Constants
const HISTORICAL_START_DATE = "2024-01-01"
const TRANSACTION_BATCH_SIZE = 500

export interface TransactionSyncStats {
  accountsUpdated: number
  transactionsAdded: number
  transactionsModified: number
  transactionsRemoved: number
}

export interface InvestmentSyncStats {
  securitiesAdded: number
  holdingsAdded: number
  holdingsUpdated: number
  holdingsRemoved: number
  investmentTransactionsAdded: number
}

export interface SyncStats extends TransactionSyncStats, InvestmentSyncStats {}

export interface SyncOptions {
  syncTransactions?: boolean
  syncInvestments?: boolean
}

// Helper functions

/**
 * Builds transaction data object for Prisma upsert from Plaid transaction
 */
function buildTransactionData(t: any) {
  return {
    amount: new Prisma.Decimal(t.amount),
    isoCurrencyCode: t.iso_currency_code || null,
    date: new Date(t.date),
    authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
    pending: t.pending,
    merchantName: t.merchant_name || null,
    name: t.name,
    plaidCategory: t.personal_finance_category?.primary || null,
    plaidSubcategory: t.personal_finance_category?.detailed || null,
    paymentChannel: t.payment_channel || null,
    pendingTransactionId: t.pending_transaction_id || null,
    logoUrl: t.logo_url || null,
    categoryIconUrl: t.personal_finance_category_icon_url || null,
  }
}

/**
 * Checks if a transaction is a split transaction that should be preserved
 */
async function isSplitTransaction(plaidTransactionId: string): Promise<boolean> {
  const existing = await prisma.transaction.findFirst({
    where: {
      OR: [
        { plaidTransactionId: plaidTransactionId },
        { originalTransactionId: plaidTransactionId },
      ],
    },
    select: { isSplit: true, parentTransactionId: true },
  })

  return !!(existing && (existing.isSplit || existing.parentTransactionId))
}

/**
 * Builds account upsert data from Plaid account
 */
function buildAccountUpsertData(a: any, itemId: string) {
  const commonData = {
    officialName: a.official_name || null,
    mask: a.mask || null,
    type: a.type,
    subtype: a.subtype || null,
    currency: a.balances.iso_currency_code || null,
    currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
    availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
    creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
    balanceUpdatedAt: new Date(),
  }

  return {
    update: {
      itemId,
      ...commonData,
      // Don't update name - preserve user's custom account names
    },
    create: {
      plaidAccountId: a.account_id,
      itemId,
      name: a.name ?? a.official_name ?? "Account",
      ...commonData,
    },
  }
}

/**
 * Builds security upsert data from Plaid security
 */
function buildSecurityUpsertData(s: any) {
  const data = {
    name: s.name || null,
    tickerSymbol: s.ticker_symbol || null,
    type: s.type || null,
    isoCurrencyCode: s.iso_currency_code || null,
  }

  return {
    update: data,
    create: {
      plaidSecurityId: s.security_id,
      ...data,
    },
  }
}

/**
 * Builds holding upsert data from Plaid holding, optionally preserving existing price
 */
function buildHoldingUpsertData(
  h: any,
  accountId: string,
  securityId: string,
  existingHolding: { institutionPrice: Prisma.Decimal | null; institutionPriceAsOf: Date | null } | null,
) {
  // Determine which price to use
  let priceToUse = h.institution_price != null ? new Prisma.Decimal(h.institution_price) : null
  let priceAsOfToUse = h.institution_price_as_of ? new Date(h.institution_price_as_of) : null

  // If existing holding has a non-zero price and Plaid's price is 0 or null, preserve the existing price
  if (existingHolding?.institutionPrice && existingHolding.institutionPrice.toNumber() > 0) {
    if (!priceToUse || priceToUse.toNumber() === 0) {
      priceToUse = existingHolding.institutionPrice
      priceAsOfToUse = existingHolding.institutionPriceAsOf
    }
  }

  const data = {
    quantity: new Prisma.Decimal(h.quantity),
    costBasis: h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
    institutionPrice: priceToUse,
    institutionPriceAsOf: priceAsOfToUse,
    isoCurrencyCode: h.iso_currency_code || null,
  }

  return {
    update: data,
    create: {
      accountId,
      securityId,
      ...data,
    },
  }
}

/**
 * Builds investment transaction upsert data from Plaid investment transaction
 */
function buildInvestmentTransactionUpsertData(t: any, accountId: string, securityId: string | null) {
  const data = {
    accountId,
    securityId: securityId || null,
    type: t.type,
    amount: t.amount != null ? new Prisma.Decimal(t.amount) : null,
    price: t.price != null ? new Prisma.Decimal(t.price) : null,
    quantity: t.quantity != null ? new Prisma.Decimal(t.quantity) : null,
    fees: t.fees != null ? new Prisma.Decimal(t.fees) : null,
    isoCurrencyCode: t.iso_currency_code || null,
    date: new Date(t.date),
    name: t.name || null,
  }

  return {
    update: data,
    create: {
      plaidInvestmentTransactionId: t.investment_transaction_id,
      ...data,
    },
  }
}

/**
 * Syncs banking transactions for a single item
 */
export async function syncItemTransactions(
  itemId: string,
  accessToken: string,
  lastCursor: string | null,
): Promise<{ stats: TransactionSyncStats; newCursor: string }> {
  const plaid = getPlaidClient()
  const stats: TransactionSyncStats = {
    accountsUpdated: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
  }

  // First, if no cursor exists, do a historical fetch to get older data
  if (!lastCursor) {
    console.log("  📅 Fetching historical transactions...")
    const historicalEndDate = new Date().toISOString().slice(0, 10)

    let offset = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    console.log(`  ✓ Found ${totalTransactions.length} historical transaction(s)`)

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
        console.log(`    ⏭️  Skipping split: ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`)
        continue
      }

      const isNew = !existing
      const transactionData = buildTransactionData(t)

      await prisma.transaction.upsert({
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
      })

      if (isNew) {
        stats.transactionsAdded++
        console.log(`    ➕ ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`)
      }
    }
    console.log(`  ✓ Processed ${stats.transactionsAdded} new transaction(s)`)
  }

  // Now use /transactions/sync for incremental updates
  console.log("  🔄 Syncing incremental updates...")
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
      console.error("  ❌ Plaid transactionsSync error:")
      console.error("  Error code:", error.response?.data?.error_code)
      console.error("  Error message:", error.response?.data?.error_message)
      console.error("  Cursor value:", cursor)

      // Update item status if login required
      if (error.response?.data?.error_code === "ITEM_LOGIN_REQUIRED") {
        await prisma.item.update({
          where: { id: itemId },
          data: { status: "ITEM_LOGIN_REQUIRED" },
        })
        revalidateTag("items", "max")
        console.error("  ℹ️  Item status updated to ITEM_LOGIN_REQUIRED")
        console.error("  ℹ️  Visit /settings/connections to reauthorize")
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

    // Added transactions
    for (const t of resp.data.added) {
      // Check if this matches a split transaction by originalTransactionId
      const existingSplit = await prisma.transaction.findFirst({
        where: {
          originalTransactionId: t.transaction_id,
          isSplit: true,
        },
      })

      if (existingSplit) {
        console.log(`    ⏭️  Skipping split: ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`)
        continue
      }

      stats.transactionsAdded++
      const transactionData = buildTransactionData(t)

      await prisma.transaction.upsert({
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
      })
      console.log(`    ➕ ${t.date} | ${t.name} | $${t.amount}`)
    }

    // Modified transactions (e.g., pending -> posted)
    for (const t of resp.data.modified) {
      // Don't update split transactions (preserve user customization)
      if (await isSplitTransaction(t.transaction_id)) {
        console.log(`    ⏭️  Skipping split update: ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`)
        continue
      }

      stats.transactionsModified++
      const transactionData = buildTransactionData(t)

      await prisma.transaction.update({
        where: { plaidTransactionId: t.transaction_id },
        data: transactionData,
      })
      console.log(`    📝 ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`)
    }

    // Removed transactions
    const removedIds = resp.data.removed.map((r) => r.transaction_id)
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
        console.log(`    🗑️  Removed ${count} transaction(s) (preserved splits)`)
      }
    }

    cursor = resp.data.next_cursor
    hasMore = resp.data.has_more
  }

  return { stats, newCursor: cursor || "" }
}

/**
 * Syncs investments (holdings, securities, investment transactions) for a single item
 */
export async function syncItemInvestments(itemId: string, accessToken: string): Promise<InvestmentSyncStats> {
  const plaid = getPlaidClient()
  const stats: InvestmentSyncStats = {
    securitiesAdded: 0,
    holdingsAdded: 0,
    holdingsUpdated: 0,
    holdingsRemoved: 0,
    investmentTransactionsAdded: 0,
  }

  console.log("  📊 Syncing investments...")
  const accounts = (await prisma.plaidAccount.findMany({
    where: { itemId: itemId },
  })) as PlaidAccountWithRelations[]

  // Holdings
  const holdingsResp = await plaid.investmentsHoldingsGet({
    access_token: accessToken,
  })

  // Securities
  for (const s of holdingsResp.data.securities) {
    const existing = await prisma.security.findUnique({
      where: { plaidSecurityId: s.security_id },
    })
    const isNew = !existing

    const securityData = buildSecurityUpsertData(s)
    await prisma.security.upsert({
      where: { plaidSecurityId: s.security_id },
      ...securityData,
    })

    if (isNew) {
      stats.securitiesAdded++
      console.log(`    🔐 ${s.ticker_symbol || s.name || "Security"} added`)
    }
  }

  // Update holdings snapshot
  // Delete holdings that are no longer present in Plaid response
  const plaidHoldingKeys = new Set(holdingsResp.data.holdings.map((h) => `${h.account_id}_${h.security_id}`))
  const existingHoldings = await prisma.holding.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
    include: { account: true, security: true },
  })

  for (const existing of existingHoldings) {
    const key = `${existing.account.plaidAccountId}_${existing.security.plaidSecurityId}`
    if (!plaidHoldingKeys.has(key)) {
      stats.holdingsRemoved++
      await prisma.holding.delete({ where: { id: existing.id } })
      console.log(`    🗑️  ${existing.security.tickerSymbol || existing.security.name || "Holding"} removed`)
    }
  }

  // Upsert holdings from Plaid, preserving custom prices
  for (const h of holdingsResp.data.holdings) {
    const account = accounts.find((a) => a.plaidAccountId === h.account_id)
    if (!account) continue

    const security = await prisma.security.findUnique({
      where: { plaidSecurityId: h.security_id },
    })
    if (!security) continue

    // Check if holding already exists with a custom price
    const existingHolding = await prisma.holding.findFirst({
      where: {
        accountId: account.id,
        securityId: security.id,
      },
      select: {
        id: true,
        institutionPrice: true,
        institutionPriceAsOf: true,
      },
    })

    const isNewHolding = !existingHolding

    const holdingData = buildHoldingUpsertData(h, account.id, security.id, existingHolding)
    await prisma.holding.upsert({
      where: {
        id: existingHolding?.id || "new-holding",
      },
      ...holdingData,
    })

    if (isNewHolding) {
      stats.holdingsAdded++
      console.log(`    📈 ${security.tickerSymbol || security.name || "Holding"} | Qty: ${h.quantity}`)
    } else {
      stats.holdingsUpdated++
    }
  }

  // Investment transactions - fetch from beginning of 2024
  const endDate = new Date().toISOString().slice(0, 10)

  const invTxResp = await plaid.investmentsTransactionsGet({
    access_token: accessToken,
    start_date: HISTORICAL_START_DATE,
    end_date: endDate,
  })

  for (const t of invTxResp.data.investment_transactions) {
    const account = accounts.find((a) => a.plaidAccountId === t.account_id)
    if (!account) continue

    const securityId = t.security_id
      ? (
          await prisma.security.findUnique({
            where: { plaidSecurityId: t.security_id },
          })
        )?.id
      : null

    const existing = await prisma.investmentTransaction.findUnique({
      where: { plaidInvestmentTransactionId: t.investment_transaction_id },
    })
    const isNew = !existing

    const invTxData = buildInvestmentTransactionUpsertData(t, account.id, securityId)
    await prisma.investmentTransaction.upsert({
      where: { plaidInvestmentTransactionId: t.investment_transaction_id },
      ...invTxData,
    })

    if (isNew) {
      stats.investmentTransactionsAdded++
      console.log(`    💰 ${t.date} | ${t.type} | ${t.name || "Investment Transaction"}`)
    }
  }

  return stats
}

/**
 * Generic sync function that can sync transactions and/or investments
 */
export async function syncItems(options: SyncOptions = { syncTransactions: true, syncInvestments: true }) {
  const items = await prisma.item.findMany()

  const totalStats: SyncStats = {
    accountsUpdated: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
    securitiesAdded: 0,
    holdingsAdded: 0,
    holdingsUpdated: 0,
    holdingsRemoved: 0,
    investmentTransactionsAdded: 0,
  }

  const syncType =
    options.syncTransactions && options.syncInvestments
      ? "full"
      : options.syncTransactions
        ? "transactions"
        : "investments"

  console.log(`\n🔄 Starting ${syncType} sync for ${items.length} item(s)...\n`)

  for (const item of items) {
    const itemStats: SyncStats = {
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
      securitiesAdded: 0,
      holdingsAdded: 0,
      holdingsUpdated: 0,
      holdingsRemoved: 0,
      investmentTransactionsAdded: 0,
    }

    const itemInfo = await prisma.item.findUnique({
      where: { id: item.id },
      include: { institution: true },
    })
    const institutionName = itemInfo?.institution?.name || "Unknown Institution"
    console.log(`\n📦 Processing: ${institutionName}`)
    console.log("─".repeat(60))

    // Sync transactions if requested
    if (options.syncTransactions) {
      const { stats: txStats, newCursor } = await syncItemTransactions(
        item.id,
        item.accessToken,
        item.lastTransactionsCursor,
      )

      Object.assign(itemStats, txStats)

      // Update cursor
      await prisma.item.update({
        where: { id: item.id },
        data: { lastTransactionsCursor: newCursor },
      })
    }

    // Sync investments if requested
    if (options.syncInvestments) {
      const invStats = await syncItemInvestments(item.id, item.accessToken)
      Object.assign(itemStats, invStats)
    }

    // Update total stats
    totalStats.accountsUpdated += itemStats.accountsUpdated
    totalStats.transactionsAdded += itemStats.transactionsAdded
    totalStats.transactionsModified += itemStats.transactionsModified
    totalStats.transactionsRemoved += itemStats.transactionsRemoved
    totalStats.securitiesAdded += itemStats.securitiesAdded
    totalStats.holdingsAdded += itemStats.holdingsAdded
    totalStats.holdingsUpdated += itemStats.holdingsUpdated
    totalStats.holdingsRemoved += itemStats.holdingsRemoved
    totalStats.investmentTransactionsAdded += itemStats.investmentTransactionsAdded

    // Print item summary
    console.log("\n  ✅ Summary for " + institutionName + ":")
    if (options.syncTransactions) {
      console.log(`     • Accounts updated: ${itemStats.accountsUpdated}`)
      console.log(`     • Transactions added: ${itemStats.transactionsAdded}`)
      console.log(`     • Transactions modified: ${itemStats.transactionsModified}`)
      console.log(`     • Transactions removed: ${itemStats.transactionsRemoved}`)
    }
    if (options.syncInvestments) {
      console.log(`     • Securities added: ${itemStats.securitiesAdded}`)
      console.log(`     • Holdings added: ${itemStats.holdingsAdded}`)
      console.log(`     • Holdings updated: ${itemStats.holdingsUpdated}`)
      console.log(`     • Holdings removed: ${itemStats.holdingsRemoved}`)
      console.log(`     • Investment transactions added: ${itemStats.investmentTransactionsAdded}`)
    }
  }

  // Invalidate caches based on what was synced
  console.log("\n🔄 Invalidating caches...")
  if (options.syncTransactions) {
    revalidateTag("transactions", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
    console.log("  ✓ Invalidated: transactions, accounts, dashboard")
  }
  if (options.syncInvestments) {
    revalidateTag("holdings", "max")
    revalidateTag("investments", "max")
    revalidateTag("accounts", "max")
    revalidateTag("dashboard", "max")
    console.log("  ✓ Invalidated: holdings, investments, accounts, dashboard")
  }

  // Print total summary
  console.log("\n" + "═".repeat(60))
  console.log(`📊 ${syncType.toUpperCase()} SYNC COMPLETE - TOTAL SUMMARY`)
  console.log("═".repeat(60))
  if (options.syncTransactions) {
    console.log(`  Accounts updated: ${totalStats.accountsUpdated}`)
    console.log(`  Transactions added: ${totalStats.transactionsAdded}`)
    console.log(`  Transactions modified: ${totalStats.transactionsModified}`)
    console.log(`  Transactions removed: ${totalStats.transactionsRemoved}`)
  }
  if (options.syncInvestments) {
    console.log(`  Securities added: ${totalStats.securitiesAdded}`)
    console.log(`  Holdings added: ${totalStats.holdingsAdded}`)
    console.log(`  Holdings updated: ${totalStats.holdingsUpdated}`)
    console.log(`  Holdings removed: ${totalStats.holdingsRemoved}`)
    console.log(`  Investment transactions added: ${totalStats.investmentTransactionsAdded}`)
  }
  console.log("═".repeat(60) + "\n")
}
