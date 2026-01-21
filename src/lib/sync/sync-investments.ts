/**
 * Investment sync logic for Plaid integration
 * Updated to use Convex instead of Prisma
 */

import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { getPlaidClient } from "../api/plaid"
import { logInfo } from "../utils/logger"
import { InvestmentSyncStats, createInvestmentSyncStats } from "./sync-types"
import { buildSecurityData, buildHoldingData, buildInvestmentTransactionData } from "./sync-helpers"

// Constants
const HISTORICAL_START_DATE = "2024-01-01"

// Type for account with plaidAccountId
interface AccountWithPlaidId {
  id: Id<"accounts">
  plaidAccountId: string
  name: string
  type: string
  subtype: string | undefined
}

/**
 * Syncs investments (holdings, securities, investment transactions) for a single item
 */
export async function syncItemInvestments(itemId: Id<"items">, accessToken: string): Promise<InvestmentSyncStats> {
  const plaid = getPlaidClient()
  const stats = createInvestmentSyncStats()

  logInfo("  📊 Syncing investments...")
  const accounts = (await fetchQuery(api.sync.getAccountsByItemId, { itemId })) as AccountWithPlaidId[]

  // Holdings
  const holdingsResp = await plaid.investmentsHoldingsGet({
    access_token: accessToken,
  })

  // Sync securities
  await syncSecurities(holdingsResp.data.securities, stats)

  // Sync holdings
  await syncHoldings(holdingsResp.data.holdings, accounts, stats)

  // Sync investment transactions
  await syncInvestmentTransactions(accessToken, accounts, stats)

  return stats
}

/**
 * Syncs securities from Plaid response
 */
async function syncSecurities(securities: any[], stats: InvestmentSyncStats): Promise<void> {
  for (const s of securities) {
    const securityData = buildSecurityData(s)
    const result = await fetchMutation(api.sync.upsertSecurity, securityData)

    if (result.isNew) {
      stats.securitiesAdded++
      logInfo(`    🔐 ${s.ticker_symbol || s.name || "Security"} added`, {
        ticker: s.ticker_symbol,
        name: s.name,
      })
    }
  }
}

/**
 * Syncs holdings from Plaid response, handling removed holdings
 */
async function syncHoldings(
  holdings: any[],
  accounts: AccountWithPlaidId[],
  stats: InvestmentSyncStats,
): Promise<void> {
  // Get existing holdings to check for removals
  const accountIds = accounts.map((a) => a.id)
  const existingHoldings = await fetchQuery(api.sync.getHoldingsByAccountIds, { accountIds })

  // Delete holdings that are no longer present in Plaid response
  const plaidHoldingKeys = new Set(holdings.map((h) => `${h.account_id}_${h.security_id}`))

  for (const existing of existingHoldings) {
    const key = `${existing.accountPlaidId}_${existing.securityPlaidId}`
    if (!plaidHoldingKeys.has(key)) {
      stats.holdingsRemoved++
      await fetchMutation(api.sync.deleteHolding, { id: existing.id })
      logInfo(`    🗑️  Holding removed`, { holdingId: existing.id })
    }
  }

  // Upsert holdings from Plaid, preserving custom prices
  for (const h of holdings) {
    const account = accounts.find((a) => a.plaidAccountId === h.account_id)
    if (!account) continue

    const security = await fetchQuery(api.sync.getSecurityByPlaidId, { plaidSecurityId: h.security_id })
    if (!security) continue

    // Check if holding already exists with a custom price
    const existingHolding = await fetchQuery(api.sync.getHoldingByAccountAndSecurity, {
      accountId: account.id,
      securityId: security.id,
    })

    const holdingData = buildHoldingData(h, account.id, security.id, existingHolding)
    const result = await fetchMutation(api.sync.upsertHolding, holdingData)

    if (result.isNew) {
      stats.holdingsAdded++
      logInfo(`    📈 Holding | Qty: ${h.quantity}`, {
        quantity: h.quantity,
      })
    } else {
      stats.holdingsUpdated++
    }
  }
}

/**
 * Syncs investment transactions from Plaid
 */
async function syncInvestmentTransactions(
  accessToken: string,
  accounts: AccountWithPlaidId[],
  stats: InvestmentSyncStats,
): Promise<void> {
  const plaid = getPlaidClient()
  const endDate = new Date().toISOString().slice(0, 10)

  const invTxResp = await plaid.investmentsTransactionsGet({
    access_token: accessToken,
    start_date: HISTORICAL_START_DATE,
    end_date: endDate,
  })

  for (const t of invTxResp.data.investment_transactions) {
    const account = accounts.find((a) => a.plaidAccountId === t.account_id)
    if (!account) continue

    let securityId: Id<"securities"> | undefined = undefined
    if (t.security_id) {
      const security = await fetchQuery(api.sync.getSecurityByPlaidId, { plaidSecurityId: t.security_id })
      securityId = security?.id
    }

    const existing = await fetchQuery(api.sync.findInvestmentTransactionByPlaidId, {
      plaidInvestmentTransactionId: t.investment_transaction_id,
    })
    const isNew = !existing

    const invTxData = buildInvestmentTransactionData(t, account.id, securityId)
    await fetchMutation(api.sync.upsertInvestmentTransaction, invTxData)

    if (isNew) {
      stats.investmentTransactionsAdded++
      logInfo(`    💰 ${t.date} | ${t.type} | ${t.name || "Investment Transaction"}`, {
        date: t.date,
        type: t.type,
        name: t.name,
      })
    }
  }
}
