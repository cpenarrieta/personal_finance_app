/**
 * Investment sync logic for Plaid integration
 */

import { PlaidAccountWithRelations } from "@/types"
import { getPlaidClient } from "../api/plaid"
import { prisma } from "../db/prisma"
import { logInfo } from "../utils/logger"
import { InvestmentSyncStats, createInvestmentSyncStats } from "./sync-types"
import { buildSecurityUpsertData, buildHoldingUpsertData, buildInvestmentTransactionUpsertData } from "./sync-helpers"

// Constants
const HISTORICAL_START_DATE = "2024-01-01"

/**
 * Syncs investments (holdings, securities, investment transactions) for a single item
 */
export async function syncItemInvestments(itemId: string, accessToken: string): Promise<InvestmentSyncStats> {
  const plaid = getPlaidClient()
  const stats = createInvestmentSyncStats()

  logInfo("  📊 Syncing investments...")
  const accounts = (await prisma.plaidAccount.findMany({
    where: { itemId: itemId },
  })) as PlaidAccountWithRelations[]

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
  accounts: PlaidAccountWithRelations[],
  stats: InvestmentSyncStats,
): Promise<void> {
  // Delete holdings that are no longer present in Plaid response
  const plaidHoldingKeys = new Set(holdings.map((h) => `${h.account_id}_${h.security_id}`))
  const existingHoldings = await prisma.holding.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
    include: { account: true, security: true },
  })

  for (const existing of existingHoldings) {
    const key = `${existing.account.plaidAccountId}_${existing.security.plaidSecurityId}`
    if (!plaidHoldingKeys.has(key)) {
      stats.holdingsRemoved++
      await prisma.holding.delete({ where: { id: existing.id } })
      logInfo(`    🗑️  ${existing.security.tickerSymbol || existing.security.name || "Holding"} removed`, {
        ticker: existing.security.tickerSymbol,
        name: existing.security.name,
      })
    }
  }

  // Upsert holdings from Plaid, preserving custom prices
  for (const h of holdings) {
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
      logInfo(`    📈 ${security.tickerSymbol || security.name || "Holding"} | Qty: ${h.quantity}`, {
        ticker: security.tickerSymbol,
        name: security.name,
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
  accounts: PlaidAccountWithRelations[],
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

    const securityId = t.security_id
      ? ((
          await prisma.security.findUnique({
            where: { plaidSecurityId: t.security_id },
          })
        )?.id ?? null)
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
      logInfo(`    💰 ${t.date} | ${t.type} | ${t.name || "Investment Transaction"}`, {
        date: t.date,
        type: t.type,
        name: t.name,
      })
    }
  }
}
