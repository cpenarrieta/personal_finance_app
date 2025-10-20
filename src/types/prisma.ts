/**
 * Centralized Prisma type definitions
 *
 * This file contains type-safe extractors for all Prisma models with their relations.
 * Use these types throughout your application for consistency and type safety.
 */

import { Prisma } from '@prisma/client'

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Transaction with all commonly used relations
 * Use this for full transaction queries with account, categories, and tags
 */
export const transactionWithRelations = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    account: true,
    customCategory: true,
    customSubcategory: {
      include: {
        category: true,
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
  },
})

export type TransactionWithRelations = Prisma.TransactionGetPayload<
  typeof transactionWithRelations
>

/**
 * Transaction with account only
 * Use for simpler queries where you only need account info
 */
export const transactionWithAccount = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    account: true,
  },
})

export type TransactionWithAccount = Prisma.TransactionGetPayload<
  typeof transactionWithAccount
>

// ============================================================================
// PLAID ACCOUNT TYPES (Bank/Financial Accounts)
// ============================================================================

/**
 * PlaidAccount with item and institution relations
 * Use this for bank account queries with full institution details
 */
export const plaidAccountWithRelations = Prisma.validator<Prisma.PlaidAccountDefaultArgs>()({
  include: {
    item: {
      include: {
        institution: true,
      },
    },
  },
})

export type PlaidAccountWithRelations = Prisma.PlaidAccountGetPayload<typeof plaidAccountWithRelations>

/**
 * PlaidAccount with transaction count
 * Use this to show how many transactions are associated with each account
 */
export const plaidAccountWithTransactionCount = Prisma.validator<Prisma.PlaidAccountDefaultArgs>()({
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
  },
})

export type PlaidAccountWithTransactionCount = Prisma.PlaidAccountGetPayload<
  typeof plaidAccountWithTransactionCount
>

// Legacy aliases for backward compatibility (deprecated - use PlaidAccount types)
/** @deprecated Use plaidAccountWithRelations instead */
export const accountWithRelations = plaidAccountWithRelations
/** @deprecated Use PlaidAccountWithRelations instead */
export type AccountWithRelations = PlaidAccountWithRelations
/** @deprecated Use plaidAccountWithTransactionCount instead */
export const accountWithTransactionCount = plaidAccountWithTransactionCount
/** @deprecated Use PlaidAccountWithTransactionCount instead */
export type AccountWithTransactionCount = PlaidAccountWithTransactionCount

// ============================================================================
// ITEM TYPES
// ============================================================================

/**
 * Item with institution and accounts
 */
export const itemWithRelations = Prisma.validator<Prisma.ItemDefaultArgs>()({
  include: {
    institution: true,
    accounts: true,
  },
})

export type ItemWithRelations = Prisma.ItemGetPayload<typeof itemWithRelations>

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Custom category with subcategories
 */
export const customCategoryWithSubcategories = Prisma.validator<Prisma.CustomCategoryDefaultArgs>()({
  include: {
    subcategories: {
      orderBy: {
        name: 'asc' as const,
      },
    },
  },
})

export type CustomCategoryWithSubcategories = Prisma.CustomCategoryGetPayload<
  typeof customCategoryWithSubcategories
>

/**
 * Custom category with transaction count
 */
export const customCategoryWithCount = Prisma.validator<Prisma.CustomCategoryDefaultArgs>()({
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
  },
})

export type CustomCategoryWithCount = Prisma.CustomCategoryGetPayload<
  typeof customCategoryWithCount
>

// ============================================================================
// TAG TYPES
// ============================================================================

/**
 * Tag with transaction count
 */
export const tagWithCount = Prisma.validator<Prisma.TagDefaultArgs>()({
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
  },
})

export type TagWithCount = Prisma.TagGetPayload<typeof tagWithCount>

// ============================================================================
// HOLDING TYPES
// ============================================================================

/**
 * Holding with Plaid account and security
 * Use this for investment holdings with full account details
 */
export const holdingWithRelations = Prisma.validator<Prisma.HoldingDefaultArgs>()({
  include: {
    account: true, // This is a PlaidAccount
    security: true,
  },
})

export type HoldingWithRelations = Prisma.HoldingGetPayload<typeof holdingWithRelations>

// ============================================================================
// INVESTMENT TRANSACTION TYPES
// ============================================================================

/**
 * Investment transaction with Plaid account and security
 * Use this for investment transactions with full account and security details
 */
export const investmentTransactionWithRelations = Prisma.validator<Prisma.InvestmentTransactionDefaultArgs>()({
  include: {
    account: true, // This is a PlaidAccount
    security: true,
  },
})

export type InvestmentTransactionWithRelations = Prisma.InvestmentTransactionGetPayload<
  typeof investmentTransactionWithRelations
>

// ============================================================================
// SECURITY TYPES
// ============================================================================

/**
 * Security with holdings count
 */
export const securityWithCount = Prisma.validator<Prisma.SecurityDefaultArgs>()({
  include: {
    _count: {
      select: {
        holdings: true,
        investmentTx: true,
      },
    },
  },
})

export type SecurityWithCount = Prisma.SecurityGetPayload<typeof securityWithCount>

// ============================================================================
// CATEGORY GROUP TYPES
// ============================================================================

/**
 * Category group with items and categories
 */
export const categoryGroupWithItems = Prisma.validator<Prisma.CategoryGroupDefaultArgs>()({
  include: {
    items: {
      include: {
        category: true,
      },
    },
  },
})

export type CategoryGroupWithItems = Prisma.CategoryGroupGetPayload<
  typeof categoryGroupWithItems
>

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
  return transaction.tags.map((tt) => ({
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
  transaction: transactionWithRelations.include,
  plaidAccount: plaidAccountWithRelations.include,
  account: plaidAccountWithRelations.include, // Legacy alias (deprecated)
  item: itemWithRelations.include,
  customCategory: customCategoryWithSubcategories.include,
  holding: holdingWithRelations.include,
  investmentTransaction: investmentTransactionWithRelations.include,
} as const
