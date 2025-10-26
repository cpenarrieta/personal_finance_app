/**
 * Centralized Prisma type definitions
 *
 * This file contains type-safe extractors for all Prisma models with their relations.
 * Use these types throughout your application for consistency and type safety.
 *
 * IMPORTANT: All types exported from this file are auto-serialized:
 * - Date fields are strings (ISO format)
 * - Decimal fields are strings
 * This is handled automatically by the Prisma extension in lib/prisma.ts
 */

import { Prisma } from '@prisma/client'
import type {
  Transaction as PrismaTransaction,
  PlaidAccount as PrismaPlaidAccount,
  Tag as PrismaTag,
  CustomCategory as PrismaCustomCategory,
  CustomSubcategory as PrismaCustomSubcategory,
  Holding as PrismaHolding,
  Security as PrismaSecurity,
  InvestmentTransaction as PrismaInvestmentTransaction,
  Item as PrismaItem,
  Institution as PrismaInstitution,
} from '@prisma/client'
import type { Serialized } from '@/lib/prisma-extension'

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
    parentTransaction: {
      include: {
        customCategory: true,
      },
    },
    childTransactions: {
      include: {
        customCategory: true,
        customSubcategory: true,
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
  },
})

/**
 * Transaction with all relations - auto-serialized
 * Date and Decimal fields are automatically converted to strings
 */
export type TransactionWithRelations = Serialized<
  Prisma.TransactionGetPayload<typeof transactionWithRelations>
>

/**
 * Transaction with account only - auto-serialized
 * Use for simpler queries where you only need account info
 */
export const transactionWithAccount = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    account: true,
  },
})

export type TransactionWithAccount = Serialized<
  Prisma.TransactionGetPayload<typeof transactionWithAccount>
>

// ============================================================================
// PLAID ACCOUNT TYPES (Bank/Financial Accounts)
// ============================================================================

/**
 * PlaidAccount with item and institution relations - auto-serialized
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

export type PlaidAccountWithRelations = Serialized<
  Prisma.PlaidAccountGetPayload<typeof plaidAccountWithRelations>
>

/**
 * PlaidAccount with transaction count - auto-serialized
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

export type PlaidAccountWithTransactionCount = Serialized<
  Prisma.PlaidAccountGetPayload<typeof plaidAccountWithTransactionCount>
>

// ============================================================================
// ITEM TYPES
// ============================================================================

/**
 * Item with institution and accounts - auto-serialized
 */
export const itemWithRelations = Prisma.validator<Prisma.ItemDefaultArgs>()({
  include: {
    institution: true,
    accounts: true,
  },
})

export type ItemWithRelations = Serialized<
  Prisma.ItemGetPayload<typeof itemWithRelations>
>

// ============================================================================
// CATEGORY TYPES
// ============================================================================

/**
 * Custom category with subcategories - auto-serialized
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

export type CustomCategoryWithSubcategories = Serialized<
  Prisma.CustomCategoryGetPayload<typeof customCategoryWithSubcategories>
>

/**
 * Custom category with transaction count - auto-serialized
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

export type CustomCategoryWithCount = Serialized<
  Prisma.CustomCategoryGetPayload<typeof customCategoryWithCount>
>

// ============================================================================
// TAG TYPES
// ============================================================================

/**
 * Tag with transaction count - auto-serialized
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

export type TagWithCount = Serialized<
  Prisma.TagGetPayload<typeof tagWithCount>
>

// ============================================================================
// HOLDING TYPES
// ============================================================================

/**
 * Holding with Plaid account and security - auto-serialized
 * Use this for investment holdings with full account details
 */
export const holdingWithRelations = Prisma.validator<Prisma.HoldingDefaultArgs>()({
  include: {
    account: true, // This is a PlaidAccount
    security: true,
  },
})

export type HoldingWithRelations = Serialized<
  Prisma.HoldingGetPayload<typeof holdingWithRelations>
>

// ============================================================================
// INVESTMENT TRANSACTION TYPES
// ============================================================================

/**
 * Investment transaction with Plaid account and security - auto-serialized
 * Use this for investment transactions with full account and security details
 */
export const investmentTransactionWithRelations = Prisma.validator<Prisma.InvestmentTransactionDefaultArgs>()({
  include: {
    account: true, // This is a PlaidAccount
    security: true,
  },
})

export type InvestmentTransactionWithRelations = Serialized<
  Prisma.InvestmentTransactionGetPayload<typeof investmentTransactionWithRelations>
>

// ============================================================================
// SECURITY TYPES
// ============================================================================

/**
 * Security with holdings count - auto-serialized
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

export type SecurityWithCount = Serialized<
  Prisma.SecurityGetPayload<typeof securityWithCount>
>

// ============================================================================
// CATEGORY GROUP TYPES
// ============================================================================

/**
 * Category group with items and categories - auto-serialized
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

export type CategoryGroupWithItems = Serialized<
  Prisma.CategoryGroupGetPayload<typeof categoryGroupWithItems>
>

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Auto-serialized versions of base Prisma models (without relations)
 * These are the most commonly used types throughout the application
 */
export type Transaction = Serialized<PrismaTransaction>
export type PlaidAccount = Serialized<PrismaPlaidAccount>
export type Tag = Serialized<PrismaTag>
export type CustomCategory = Serialized<PrismaCustomCategory>
export type CustomSubcategory = Serialized<PrismaCustomSubcategory>
export type Holding = Serialized<PrismaHolding>
export type Security = Serialized<PrismaSecurity>
export type InvestmentTransaction = Serialized<PrismaInvestmentTransaction>
export type Item = Serialized<PrismaItem>
export type Institution = Serialized<PrismaInstitution>

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
  item: itemWithRelations.include,
  customCategory: customCategoryWithSubcategories.include,
  holding: holdingWithRelations.include,
  investmentTransaction: investmentTransactionWithRelations.include,
} as const
