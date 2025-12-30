/**
 * Centralized Prisma type definitions
 *
 * This file contains type-safe extractors for all Prisma models with their relations.
 * Use these types throughout your application for consistency and type safety.
 *
 * Updated for Prisma v7 - uses direct type definitions instead of Prisma.validator
 */

import { Prisma } from "@prisma/generated"

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Transaction include object for all commonly used relations
 * Use this for full transaction queries with account, categories, and tags
 */
export const transactionInclude = {
  account: true,
  category: true,
  subcategory: {
    include: {
      category: true,
    },
  },
  parentTransaction: {
    include: {
      category: true,
    },
  },
  childTransactions: {
    include: {
      category: true,
      subcategory: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
} as const satisfies Prisma.TransactionInclude

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude
}>

/**
 * Transaction with account only
 * Use for simpler queries where you only need account info
 */
export const transactionWithAccountInclude = {
  account: true,
} as const satisfies Prisma.TransactionInclude

export type TransactionWithAccount = Prisma.TransactionGetPayload<{
  include: typeof transactionWithAccountInclude
}>

// Legacy aliases for backward compatibility
/** @deprecated Use transactionInclude instead */
export const transactionWithRelations = { include: transactionInclude }

// ============================================================================
// PLAID ACCOUNT TYPES (Bank/Financial Accounts)
// ============================================================================

/**
 * PlaidAccount include object for item and institution relations
 * Use this for bank account queries with full institution details
 */
export const plaidAccountInclude = {
  item: {
    include: {
      institution: true,
    },
  },
} as const satisfies Prisma.PlaidAccountInclude

export type PlaidAccountWithRelations = Prisma.PlaidAccountGetPayload<{
  include: typeof plaidAccountInclude
}>

/**
 * PlaidAccount include for transaction count
 * Use this to show how many transactions are associated with each account
 */
export const plaidAccountWithTransactionCountInclude = {
  _count: {
    select: {
      transactions: true,
    },
  },
} as const satisfies Prisma.PlaidAccountInclude

export type PlaidAccountWithTransactionCount = Prisma.PlaidAccountGetPayload<{
  include: typeof plaidAccountWithTransactionCountInclude
}>

// Legacy aliases for backward compatibility (deprecated - use PlaidAccount types)
/** @deprecated Use plaidAccountInclude instead */
export const plaidAccountWithRelations = { include: plaidAccountInclude }
/** @deprecated Use plaidAccountInclude instead */
export const accountWithRelations = { include: plaidAccountInclude }
/** @deprecated Use PlaidAccountWithRelations instead */
export type AccountWithRelations = PlaidAccountWithRelations
/** @deprecated Use plaidAccountWithTransactionCountInclude instead */
export const accountWithTransactionCount = { include: plaidAccountWithTransactionCountInclude }
/** @deprecated Use PlaidAccountWithTransactionCount instead */
export type AccountWithTransactionCount = PlaidAccountWithTransactionCount

// ============================================================================
// ITEM TYPES
// ============================================================================

/**
 * Item include object for institution and accounts
 */
export const itemInclude = {
  institution: true,
  accounts: true,
} as const satisfies Prisma.ItemInclude

export type ItemWithRelations = Prisma.ItemGetPayload<{
  include: typeof itemInclude
}>

// Legacy alias
/** @deprecated Use itemInclude instead */
export const itemWithRelations = { include: itemInclude }

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Category include object with subcategories
 */
export const categoryInclude = {
  subcategories: {
    orderBy: {
      name: "asc" as const,
    },
  },
} as const satisfies Prisma.CategoryInclude

export type CategoryWithSubcategories = Prisma.CategoryGetPayload<{
  include: typeof categoryInclude
}>

/**
 * Category include for transaction count
 */
export const categoryWithCountInclude = {
  _count: {
    select: {
      transactions: true,
    },
  },
} as const satisfies Prisma.CategoryInclude

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: typeof categoryWithCountInclude
}>

// Legacy aliases
/** @deprecated Use categoryInclude instead */
export const categoryWithSubcategories = { include: categoryInclude }
/** @deprecated Use categoryWithCountInclude instead */
export const categoryWithCount = { include: categoryWithCountInclude }

// ============================================================================
// TAG TYPES
// ============================================================================

/**
 * Tag include for transaction count
 */
export const tagWithCountInclude = {
  _count: {
    select: {
      transactions: true,
    },
  },
} as const satisfies Prisma.TagInclude

export type TagWithCount = Prisma.TagGetPayload<{
  include: typeof tagWithCountInclude
}>

// Legacy alias
/** @deprecated Use tagWithCountInclude instead */
export const tagWithCount = { include: tagWithCountInclude }

// ============================================================================
// HOLDING TYPES
// ============================================================================

/**
 * Holding include for Plaid account and security
 * Use this for investment holdings with full account details
 */
export const holdingInclude = {
  account: true, // This is a PlaidAccount
  security: true,
} as const satisfies Prisma.HoldingInclude

export type HoldingWithRelations = Prisma.HoldingGetPayload<{
  include: typeof holdingInclude
}>

// Legacy alias
/** @deprecated Use holdingInclude instead */
export const holdingWithRelations = { include: holdingInclude }

// ============================================================================
// INVESTMENT TRANSACTION TYPES
// ============================================================================

/**
 * Investment transaction include for Plaid account and security
 * Use this for investment transactions with full account and security details
 */
export const investmentTransactionInclude = {
  account: true, // This is a PlaidAccount
  security: true,
} as const satisfies Prisma.InvestmentTransactionInclude

export type InvestmentTransactionWithRelations = Prisma.InvestmentTransactionGetPayload<{
  include: typeof investmentTransactionInclude
}>

// Legacy alias
/** @deprecated Use investmentTransactionInclude instead */
export const investmentTransactionWithRelations = { include: investmentTransactionInclude }

// ============================================================================
// SECURITY TYPES
// ============================================================================

/**
 * Security include for holdings count
 */
export const securityWithCountInclude = {
  _count: {
    select: {
      holdings: true,
      investmentTx: true,
    },
  },
} as const satisfies Prisma.SecurityInclude

export type SecurityWithCount = Prisma.SecurityGetPayload<{
  include: typeof securityWithCountInclude
}>

// Legacy alias
/** @deprecated Use securityWithCountInclude instead */
export const securityWithCount = { include: securityWithCountInclude }

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Extract just the tag data from a TransactionTag join
 */
export type TransactionTagData = {
  id: string
  name: string
  color: string
}

/**
 * Helper to extract tags from a transaction with relations
 */
export function extractTags(transaction: TransactionWithRelations): TransactionTagData[] {
  return transaction.tags.map((tt: { tag: { id: string; name: string; color: string } }) => ({
    id: tt.tag.id,
    name: tt.tag.name,
    color: tt.tag.color,
  }))
}

/**
 * Common Prisma include patterns
 * Import these to ensure consistency across your app
 */
export const PrismaIncludes = {
  transaction: transactionInclude,
  plaidAccount: plaidAccountInclude,
  account: plaidAccountInclude, // Legacy alias (deprecated)
  item: itemInclude,
  category: categoryInclude,
  holding: holdingInclude,
  investmentTransaction: investmentTransactionInclude,
} as const
