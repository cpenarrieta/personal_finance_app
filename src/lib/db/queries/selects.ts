/**
 * Shared Prisma select statements for consistent query results
 * These selects are reused across multiple queries to ensure consistency
 */

/**
 * Minimal account select for transaction relations
 */
export const ACCOUNT_SELECT_MINIMAL = {
  id: true,
  name: true,
  type: true,
  mask: true,
} as const

/**
 * Category select for transaction relations
 */
export const CATEGORY_SELECT = {
  id: true,
  name: true,
  imageUrl: true,
  isTransferCategory: true,
  created_at_string: true,
  updated_at_string: true,
} as const

/**
 * Subcategory select for transaction relations
 */
export const SUBCATEGORY_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  imageUrl: true,
  created_at_string: true,
  updated_at_string: true,
} as const

/**
 * Tag select for transaction relations
 */
export const TAG_SELECT = {
  tag: {
    select: {
      id: true,
      name: true,
      color: true,
      created_at_string: true,
      updated_at_string: true,
    },
  },
} as const

/**
 * Full transaction select statement with all relations
 * Use this for lists and detail views
 */
export const TRANSACTION_SELECT = {
  id: true,
  plaidTransactionId: true,
  accountId: true,
  amount_number: true, // Generated column
  isoCurrencyCode: true,
  datetime: true,
  authorizedDatetime: true,
  pending: true,
  merchantName: true,
  name: true,
  plaidCategory: true,
  plaidSubcategory: true,
  paymentChannel: true,
  pendingTransactionId: true,
  logoUrl: true,
  categoryIconUrl: true,
  categoryId: true,
  subcategoryId: true,
  notes: true,
  isSplit: true,
  parentTransactionId: true,
  originalTransactionId: true,
  created_at_string: true, // Generated column
  updated_at_string: true, // Generated column
  account: {
    select: ACCOUNT_SELECT_MINIMAL,
  },
  category: {
    select: CATEGORY_SELECT,
  },
  subcategory: {
    select: SUBCATEGORY_SELECT,
  },
  tags: {
    select: TAG_SELECT,
  },
} as const

/**
 * Minimal transaction select without files (for lists)
 */
export const TRANSACTION_SELECT_MINIMAL = {
  id: true,
  plaidTransactionId: true,
  accountId: true,
  amount_number: true,
  isoCurrencyCode: true,
  datetime: true,
  authorizedDatetime: true,
  pending: true,
  merchantName: true,
  name: true,
  plaidCategory: true,
  plaidSubcategory: true,
  paymentChannel: true,
  pendingTransactionId: true,
  logoUrl: true,
  categoryIconUrl: true,
  categoryId: true,
  subcategoryId: true,
  notes: true,
  isSplit: true,
  parentTransactionId: true,
  originalTransactionId: true,
  created_at_string: true,
  updated_at_string: true,
  account: {
    select: ACCOUNT_SELECT_MINIMAL,
  },
  category: {
    select: CATEGORY_SELECT,
  },
  subcategory: {
    select: SUBCATEGORY_SELECT,
  },
  tags: {
    select: TAG_SELECT,
  },
} as const

/**
 * Security select for investment relations
 */
export const SECURITY_SELECT = {
  id: true,
  plaidSecurityId: true,
  name: true,
  tickerSymbol: true,
  type: true,
  isoCurrencyCode: true,
  logoUrl: true,
  created_at_string: true,
  updated_at_string: true,
} as const
