/**
 * Central type exports
 */

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
