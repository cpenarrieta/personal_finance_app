/**
 * Helper functions for building Prisma data objects from Plaid responses
 */

import { Prisma } from "@prisma/generated"
import { prisma } from "../db/prisma"
import type { Transaction, AccountBase, Security, Holding, InvestmentTransaction } from "../api/plaid"

/**
 * Builds transaction data object for Prisma upsert from Plaid transaction
 */
export function buildTransactionData(t: Transaction) {
  return {
    amount: new Prisma.Decimal(t.amount),
    isoCurrencyCode: t.iso_currency_code || null,
    date: new Date(t.date),
    authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
    datetime: t.datetime || t.date, // Plaid datetime or fallback to date
    authorizedDatetime: t.authorized_datetime || null,
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
export async function isSplitTransaction(plaidTransactionId: string): Promise<boolean> {
  const existing = await prisma.transaction.findFirst({
    where: {
      OR: [{ plaidTransactionId: plaidTransactionId }, { originalTransactionId: plaidTransactionId }],
    },
    select: { isSplit: true, parentTransactionId: true },
  })

  return !!(existing && (existing.isSplit || existing.parentTransactionId))
}

/**
 * Builds account upsert data from Plaid account
 */
export function buildAccountUpsertData(a: AccountBase, itemId: string) {
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
export function buildSecurityUpsertData(s: Security) {
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
export function buildHoldingUpsertData(
  h: Holding,
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
export function buildInvestmentTransactionUpsertData(t: InvestmentTransaction, accountId: string, securityId: string | null) {
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
    transactionDatetime: t.date, // Store date as string in transactionDatetime column
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
