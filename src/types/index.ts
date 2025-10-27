/**
 * Central type exports
 *
 * Import types from this file throughout your application:
 * import { SerializedTransaction, TransactionWithRelations } from '@/types'
 */

// Re-export Prisma types (for database queries)
export {
  // Transaction types
  transactionWithRelations,
  type TransactionWithRelations,
  transactionWithAccount,
  type TransactionWithAccount,

  // PlaidAccount types
  plaidAccountWithRelations,
  type PlaidAccountWithRelations,
  plaidAccountWithTransactionCount,
  type PlaidAccountWithTransactionCount,

  // Legacy aliases (deprecated)
  accountWithRelations,
  type AccountWithRelations,
  accountWithTransactionCount,
  type AccountWithTransactionCount,

  // Item types
  itemWithRelations,
  type ItemWithRelations,

  // Category types (Prisma version - for database queries)
  customCategoryWithSubcategories,
  type CustomCategoryWithSubcategories as PrismaCustomCategoryWithSubcategories,
  customCategoryWithCount,
  type CustomCategoryWithCount,

  // Tag types (Prisma version - for database queries)
  tagWithCount,
  type TagWithCount as PrismaTagWithCount,

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

  // Serialized types
  serializedTagSchema,
  type SerializedTag,
  serializedPlaidAccountSchema,
  type SerializedPlaidAccount,
  serializedAccountSchema, // Legacy alias
  type SerializedAccount, // Legacy alias
  serializedCustomCategorySchema,
  type SerializedCustomCategory,
  serializedCustomSubcategorySchema,
  type SerializedCustomSubcategory,
  serializedTransactionSchema,
  type SerializedTransaction,

  // Transaction API schemas
  updateTransactionSchema,
  type UpdateTransactionPayload,
  bulkUpdateTransactionsSchema,
  type BulkUpdateTransactionsPayload,

  // Category API schemas (API version - for serialization)
  createCustomCategorySchema,
  type CreateCustomCategoryPayload,
  updateCustomCategorySchema,
  type UpdateCustomCategoryPayload,
  createCustomSubcategorySchema,
  type CreateCustomSubcategoryPayload,
  customCategoryWithSubcategoriesSchema,
  type CustomCategoryWithSubcategories, // API version (serialized)

  // Tag API schemas (API version - for serialization)
  createTagSchema,
  type CreateTagPayload,
  updateTagSchema,
  type UpdateTagPayload,
  tagWithCountSchema,
  type TagWithCount, // API version (serialized)

  // PlaidAccount API schemas
  serializedPlaidAccountFullSchema,
  type SerializedPlaidAccountFull,
  serializedAccountFullSchema, // Legacy alias
  type SerializedAccountFull, // Legacy alias

  // Plaid API schemas
  createLinkTokenResponseSchema,
  type CreateLinkTokenResponse,
  exchangePublicTokenSchema,
  type ExchangePublicTokenPayload,

  // Holding API schemas
  serializedHoldingSchema,
  type SerializedHolding,

  // Investment transaction API schemas
  serializedInvestmentTransactionSchema,
  type SerializedInvestmentTransaction,

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

// Re-export client types (using generated columns - no serialization needed)
export {
  type TransactionForClient,
  type CategoryForClient,
  type SubcategoryForClient,
  type TagForClient,
  type PlaidAccountForClient,
  type HoldingForClient,
  type InvestmentTransactionForClient,
} from './client'

// Re-export from transaction utilities
export {
  serializeTransaction,
  serializeCustomCategory,
  serializeTag,
  serializePlaidAccount,
  TRANSACTION_INCLUDE,
} from './transaction'
