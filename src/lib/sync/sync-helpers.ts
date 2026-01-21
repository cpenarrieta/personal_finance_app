/**
 * Helper functions for building data objects from Plaid responses
 * Updated to use Convex instead of Prisma
 */

import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import type { Transaction, AccountBase, Security, Holding, InvestmentTransaction } from "../api/plaid"

/**
 * Builds transaction data object for Convex from Plaid transaction
 */
export function buildTransactionData(t: Transaction) {
  // Parse date to timestamp
  const dateTs = new Date(t.date).getTime()
  const authorizedDateTs = t.authorized_date ? new Date(t.authorized_date).getTime() : undefined

  return {
    // Invert Plaid sign convention (positive=expense) to user convention (negative=expense)
    amount: t.amount * -1,
    isoCurrencyCode: t.iso_currency_code || undefined,
    date: dateTs,
    authorizedDate: authorizedDateTs,
    datetime: t.datetime || t.date, // Plaid datetime or fallback to date
    authorizedDatetime: t.authorized_datetime || undefined,
    pending: t.pending,
    merchantName: t.merchant_name || undefined,
    name: t.name,
    plaidCategory: t.personal_finance_category?.primary || undefined,
    plaidSubcategory: t.personal_finance_category?.detailed || undefined,
    paymentChannel: t.payment_channel || undefined,
    pendingTransactionId: t.pending_transaction_id || undefined,
    logoUrl: t.logo_url || undefined,
    categoryIconUrl: t.personal_finance_category_icon_url || undefined,
  }
}

/**
 * Checks if a transaction is a split transaction that should be preserved
 */
export async function isSplitTransaction(plaidTransactionId: string): Promise<boolean> {
  const existing = await fetchQuery(api.sync.findTransactionForSync, { plaidTransactionId })
  return !!(existing && (existing.isSplit || existing.parentTransactionId))
}

/**
 * Builds account data for Convex from Plaid account
 */
export function buildAccountData(a: AccountBase, itemId: Id<"items">) {
  return {
    plaidAccountId: a.account_id,
    itemId,
    name: a.name ?? a.official_name ?? "Account",
    officialName: a.official_name || undefined,
    mask: a.mask || undefined,
    type: a.type,
    subtype: a.subtype || undefined,
    currency: a.balances.iso_currency_code || undefined,
    currentBalance: a.balances.current ?? undefined,
    availableBalance: a.balances.available ?? undefined,
    creditLimit: a.balances.limit ?? undefined,
  }
}

/**
 * Builds security data for Convex from Plaid security
 */
export function buildSecurityData(s: Security) {
  return {
    plaidSecurityId: s.security_id,
    name: s.name || undefined,
    tickerSymbol: s.ticker_symbol || undefined,
    type: s.type || undefined,
    isoCurrencyCode: s.iso_currency_code || undefined,
  }
}

/**
 * Builds holding data for Convex from Plaid holding
 * Optionally preserves existing price if Plaid returns 0 or null
 */
export function buildHoldingData(
  h: Holding,
  accountId: Id<"accounts">,
  securityId: Id<"securities">,
  existingHolding: { institutionPrice: number | null; institutionPriceAsOf: number | null } | null,
) {
  // Determine which price to use
  let priceToUse = h.institution_price ?? undefined
  let priceAsOfToUse = h.institution_price_as_of ? new Date(h.institution_price_as_of).getTime() : undefined

  // If existing holding has a non-zero price and Plaid's price is 0 or null, preserve the existing price
  if (existingHolding?.institutionPrice && existingHolding.institutionPrice > 0) {
    if (!priceToUse || priceToUse === 0) {
      priceToUse = existingHolding.institutionPrice
      priceAsOfToUse = existingHolding.institutionPriceAsOf ?? undefined
    }
  }

  return {
    accountId,
    securityId,
    quantity: h.quantity,
    costBasis: h.cost_basis ?? undefined,
    institutionPrice: priceToUse,
    institutionPriceAsOf: priceAsOfToUse,
    isoCurrencyCode: h.iso_currency_code || undefined,
  }
}

/**
 * Checks if the sign of the amount has changed between existing and incoming transaction
 * Returns true if the signs differ (e.g., one is positive, other is negative)
 */
export function hasAmountSignChanged(existingAmount: number, incomingAmount: number): boolean {
  const existingSign = existingAmount >= 0 ? 1 : -1
  const incomingSign = incomingAmount >= 0 ? 1 : -1
  return existingSign !== incomingSign
}

/**
 * Adds "for-review" and "sign-review" tags to a transaction
 * Used when the amount sign changes during sync
 */
export async function addSignReviewTags(transactionId: Id<"transactions">): Promise<void> {
  // Get or create the review tags
  const { forReviewTagId, signReviewTagId } = await fetchMutation(api.sync.getOrCreateReviewTags, {})

  // Add tags to transaction
  await fetchMutation(api.sync.addTagsToTransaction, {
    transactionId,
    tagIds: [forReviewTagId, signReviewTagId],
  })
}

/**
 * Builds investment transaction data for Convex from Plaid investment transaction
 */
export function buildInvestmentTransactionData(
  t: InvestmentTransaction,
  accountId: Id<"accounts">,
  securityId: Id<"securities"> | undefined,
) {
  return {
    plaidInvestmentTransactionId: t.investment_transaction_id,
    accountId,
    securityId,
    type: t.type,
    amount: t.amount ?? undefined,
    price: t.price ?? undefined,
    quantity: t.quantity ?? undefined,
    fees: t.fees ?? undefined,
    isoCurrencyCode: t.iso_currency_code || undefined,
    date: new Date(t.date).getTime(),
    transactionDatetime: t.date,
    name: t.name || undefined,
  }
}
