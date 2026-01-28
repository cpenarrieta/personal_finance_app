/**
 * Client-safe types using generated columns and string fields
 *
 * These types use PostgreSQL generated columns (amount_number, etc.) and
 * string datetime fields which are automatically computed or directly stored.
 *
 * Benefits:
 * - No manual serialization needed
 * - Always in sync with source data
 * - Direct pass from Server Component to Client Component
 *
 * See docs/GENERATED_COLUMNS.md for more information.
 */

// Category group type (matches Convex schema)
export const CategoryGroupType = {
  EXPENSES: "EXPENSES",
  INCOME: "INCOME",
  INVESTMENT: "INVESTMENT",
  TRANSFER: "TRANSFER",
} as const

export type CategoryGroupType = (typeof CategoryGroupType)[keyof typeof CategoryGroupType]

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface TransactionForClient {
  id: string
  plaidTransactionId: string
  accountId: string
  amount_number: number // Display format: negative=expense, positive=income (direct from amount)
  isoCurrencyCode: string | null
  datetime: string // ISO 8601 datetime string from Plaid
  authorizedDatetime: string | null // ISO 8601 datetime string from Plaid
  pending: boolean
  merchantName: string | null
  name: string
  plaidCategory: string | null
  plaidSubcategory: string | null
  paymentChannel: string | null
  pendingTransactionId: string | null
  logoUrl: string | null
  categoryIconUrl: string | null
  categoryId: string | null
  subcategoryId: string | null
  notes: string | null
  isSplit: boolean
  parentTransactionId: string | null
  originalTransactionId: string | null
  files?: string[] // Array of file URLs from Cloudinary (optional for backwards compatibility)
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt

  // Relations - using partial types to allow queries that don't select all fields

  // Relations - using Partial to allow queries that don't select all fields
  account: {
    id: string
    name: string
    type: string
    mask: string | null
  } | null
  category: (Partial<CategoryForClient> & { id: string; name: string }) | null
  subcategory: (Partial<SubcategoryForClient> & { id: string; name: string }) | null
  tags: TagForClient[]
  parentTransaction?: {
    id: string
    name: string
    amount_number: number
    datetime: string
    category: {
      id: string
      name: string
    } | null
  }
  childTransactions?: {
    id: string
    name: string
    amount_number: number
    datetime: string
    category: {
      id: string
      name: string
    } | null
    subcategory: {
      id: string
      name: string
    } | null
  }[]
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface CategoryForClient {
  id: string
  name: string
  imageUrl: string | null
  groupType: CategoryGroupType | null
  displayOrder: number | null
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt
  subcategories?: SubcategoryForClient[]
}

export interface SubcategoryForClient {
  id: string
  categoryId: string
  name: string
  imageUrl: string | null
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt
  category?: {
    id: string
    name: string
    imageUrl: string | null
    created_at_string: string | null
    updated_at_string: string | null
  }
}

// ============================================================================
// TAG TYPES
// ============================================================================

export interface TagForClient {
  id: string
  name: string
  color: string
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt
}

// ============================================================================
// PLAID ACCOUNT TYPES
// ============================================================================

export interface PlaidAccountForClient {
  id: string
  plaidAccountId: string
  itemId: string
  name: string
  officialName: string | null
  mask: string | null
  type: string
  subtype: string | null
  currency: string | null
  current_balance_number: number | null // Generated from currentBalance
  available_balance_number: number | null // Generated from availableBalance
  credit_limit_number: number | null // Generated from creditLimit
  balance_updated_at_string: string | null // Generated from balanceUpdatedAt
  created_at_string: string // Generated from createdAt
  updated_at_string: string // Generated from updatedAt
}

// ============================================================================
// HOLDING TYPES
// ============================================================================

export interface HoldingForClient {
  id: string
  accountId: string
  securityId: string
  quantity_number: number | null // Generated from quantity
  cost_basis_number: number | null // Generated from costBasis
  institution_price_number: number | null // Generated from institutionPrice
  institution_price_as_of_string: string | null // Generated from institutionPriceAsOf
  isoCurrencyCode: string | null
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt

  security: {
    id: string
    name: string | null
    tickerSymbol: string | null
    type: string | null
    isoCurrencyCode: string | null
    logoUrl: string | null
  } | null

  account: {
    id: string
    name: string
    type: string
    mask: string | null
  } | null
}

// ============================================================================
// INVESTMENT TRANSACTION TYPES
// ============================================================================

export interface InvestmentTransactionForClient {
  id: string
  plaidInvestmentTransactionId: string
  accountId: string
  securityId: string | null
  type: string
  amount_number: number | null // Generated from amount
  price_number: number | null // Generated from price
  quantity_number: number | null // Generated from quantity
  fees_number: number | null // Generated from fees
  isoCurrencyCode: string | null
  transactionDatetime: string | null // ISO 8601 datetime string from Plaid
  name: string | null
  created_at_string: string | null // Generated from createdAt
  updated_at_string: string | null // Generated from updatedAt

  account: {
    id: string
    name: string
    type: string
    mask: string | null
  } | null
  security: {
    id: string
    name: string | null
    tickerSymbol: string | null
    type: string | null
    logoUrl: string | null
  } | null
}
