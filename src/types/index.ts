/**
 * Central type exports
 *
 * Import types from this file throughout your application:
 * import { TransactionWithRelations, Tag, PlaidAccount } from '@/types'
 *
 * IMPORTANT: All types are auto-serialized!
 * - Date fields are ISO strings
 * - Decimal fields are numbers
 * No manual serialization needed thanks to the Prisma extension
 */

// Re-export Prisma types (auto-serialized - Date fields are strings, Decimal fields are numbers)
export {
  // Base model types (auto-serialized)
  type Transaction,
  type PlaidAccount,
  type Tag,
  type CustomCategory,
  type CustomSubcategory,
  type Holding,
  type Security,
  type InvestmentTransaction,
  type Item,
  type Institution,

  // Transaction types with relations
  transactionWithRelations,
  type TransactionWithRelations,
  transactionWithAccount,
  type TransactionWithAccount,

  // PlaidAccount types with relations
  plaidAccountWithRelations,
  type PlaidAccountWithRelations,
  plaidAccountWithTransactionCount,
  type PlaidAccountWithTransactionCount,

  // Item types
  itemWithRelations,
  type ItemWithRelations,

  // Category types with relations
  customCategoryWithSubcategories,
  type CustomCategoryWithSubcategories,
  customCategoryWithCount,
  type CustomCategoryWithCount,

  // Tag types with relations
  tagWithCount,
  type TagWithCount,

  // Holding types
  holdingWithRelations,
  type HoldingWithRelations,

  // Investment transaction types
  investmentTransactionWithRelations,
  type InvestmentTransactionWithRelations,

  // Security types
  securityWithCount,
  type SecurityWithCount,

  // Category group types
  categoryGroupWithItems,
  type CategoryGroupWithItems,

  // Utilities
  type TransactionTagData,
  extractTags,
  PrismaIncludes,
} from './prisma'

// Re-export API types and schemas (for API requests/responses)
export {
  // Generic API types
  type ApiSuccess,
  type ApiError,
  type ApiResponse,

  // Serialized type aliases
  // These are just aliases to auto-serialized Prisma types
  type SerializedTag,
  type SerializedPlaidAccount,
  type SerializedPlaidAccountFull,
  type SerializedTransaction,
  type SerializedHolding,
  type SerializedInvestmentTransaction,

  // Transaction API request schemas (for validation)
  createTransactionSchema,
  type CreateTransactionPayload,
  updateTransactionSchema,
  type UpdateTransactionPayload,
  bulkUpdateTransactionsSchema,
  type BulkUpdateTransactionsPayload,

  // Category API request schemas (for validation)
  createCustomCategorySchema,
  type CreateCustomCategoryPayload,
  updateCustomCategorySchema,
  type UpdateCustomCategoryPayload,
  createCustomSubcategorySchema,
  type CreateCustomSubcategoryPayload,

  // Tag API request schemas (for validation)
  createTagSchema,
  type CreateTagPayload,
  updateTagSchema,
  type UpdateTagPayload,

  // Plaid API schemas
  createLinkTokenResponseSchema,
  type CreateLinkTokenResponse,
  exchangePublicTokenSchema,
  type ExchangePublicTokenPayload,

  // Analytics API schemas
  transactionByCategorySchema,
  type TransactionByCategory,
  dateRangeQuerySchema,
  type DateRangeQuery,

  // Utility functions
  createSuccessResponse,
  createErrorResponse,
  parseRequestBody,
  safeParseRequestBody,
} from './api'

// Re-export component types
export * from './components'
