/**
 * Central type exports
 *
 */

// Re-export Prisma types (for database queries)
export {
  // Transaction types
  transactionInclude,
  transactionWithRelations,
  type TransactionWithRelations,
  transactionWithAccountInclude,
  type TransactionWithAccount,

  // PlaidAccount types
  plaidAccountInclude,
  plaidAccountWithRelations,
  type PlaidAccountWithRelations,
  plaidAccountWithTransactionCountInclude,
  type PlaidAccountWithTransactionCount,

  // Legacy aliases (deprecated)
  accountWithRelations,
  type AccountWithRelations,
  accountWithTransactionCount,
  type AccountWithTransactionCount,

  // Item types
  itemInclude,
  itemWithRelations,
  type ItemWithRelations,

  // Category types (Prisma version - for database queries)
  categoryInclude,
  categoryWithSubcategories,
  type CategoryWithSubcategories as PrismaCategoryWithSubcategories,
  categoryWithCountInclude,
  categoryWithCount,
  type CategoryWithCount,

  // Tag types (Prisma version - for database queries)
  tagWithCountInclude,
  tagWithCount,
  type TagWithCount as PrismaTagWithCount,

  // Holding types
  holdingInclude,
  holdingWithRelations,
  type HoldingWithRelations,

  // Investment transaction types
  investmentTransactionInclude,
  investmentTransactionWithRelations,
  type InvestmentTransactionWithRelations,

  // Security types
  securityWithCountInclude,
  securityWithCount,
  type SecurityWithCount,

  // Utilities
  type TransactionTagData,
  extractTags,
  PrismaIncludes,
} from "./prisma"

// Re-export API types and schemas (for API requests/responses)
export {
  // Generic API types
  type ApiSuccess,
  type ApiError,
  type ApiResponse,

  // Transaction API schemas
  updateTransactionSchema,
  type UpdateTransactionPayload,
  bulkUpdateTransactionsSchema,
  type BulkUpdateTransactionsPayload,

  // Category API schemas
  createCategorySchema,
  type CreateCategoryPayload,
  updateCategorySchema,
  type UpdateCategoryPayload,
  createSubcategorySchema,
  type CreateSubcategoryPayload,
  categoryWithSubcategoriesSchema,
  type CategoryWithSubcategories,

  // Tag API schemas
  createTagSchema,
  type CreateTagPayload,
  updateTagSchema,
  type UpdateTagPayload,
  tagWithCountSchema,
  type TagWithCount,

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
} from "./api"

// Re-export component types
export * from "./components"

// Re-export client types
export {
  type TransactionForClient,
  type CategoryForClient,
  type SubcategoryForClient,
  type TagForClient,
  type PlaidAccountForClient,
  type HoldingForClient,
  type InvestmentTransactionForClient,
  CategoryGroupType,
} from "./client"

// Re-export UI state types
export {
  // Date range types
  type DateRange,
  type DateRangeOption,
  DATE_RANGE_OPTIONS,

  // Theme types
  type ThemeMode,

  // Helper functions
  getDateRangeLabel,
} from "./ui"
