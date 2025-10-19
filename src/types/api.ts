/**
 * API request/response types and Zod schemas
 *
 * This file contains:
 * - Zod schemas for runtime validation
 * - TypeScript types inferred from schemas
 * - API response wrappers
 * - Request payload types
 */

import { z } from 'zod'

// ============================================================================
// GENERIC API RESPONSE TYPES
// ============================================================================

export type ApiSuccess<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
  details?: unknown
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ============================================================================
// SERIALIZATION SCHEMAS
// ============================================================================

/**
 * Schema for serialized tag
 */
export const serializedTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
})

export type SerializedTag = z.infer<typeof serializedTagSchema>

/**
 * Schema for serialized account (nested in transactions)
 */
export const serializedAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  mask: z.string().nullable(),
})

export type SerializedAccount = z.infer<typeof serializedAccountSchema>

/**
 * Schema for serialized custom category (nested)
 */
export const serializedCustomCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type SerializedCustomCategory = z.infer<typeof serializedCustomCategorySchema>

/**
 * Schema for serialized custom subcategory (nested)
 */
export const serializedCustomSubcategorySchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: serializedCustomCategorySchema.optional(),
})

export type SerializedCustomSubcategory = z.infer<typeof serializedCustomSubcategorySchema>

/**
 * Schema for serialized transaction
 * This is the main type used for client-side transaction data
 */
export const serializedTransactionSchema = z.object({
  id: z.string(),
  plaidTransactionId: z.string(),
  accountId: z.string(),
  amount: z.string(), // Decimal as string for JSON serialization
  isoCurrencyCode: z.string().nullable(),
  date: z.string(), // ISO date string
  authorizedDate: z.string().nullable(),
  pending: z.boolean(),
  merchantName: z.string().nullable(),
  name: z.string(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  paymentChannel: z.string().nullable(),
  pendingTransactionId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  categoryIconUrl: z.string().nullable(),
  customCategoryId: z.string().nullable(),
  customSubcategoryId: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(serializedTagSchema),
  // Split transaction fields
  isSplit: z.boolean(),
  parentTransactionId: z.string().nullable(),
  originalTransactionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  account: serializedAccountSchema.nullable(),
  customCategory: serializedCustomCategorySchema.nullable(),
  customSubcategory: serializedCustomSubcategorySchema.nullable(),
})

export type SerializedTransaction = z.infer<typeof serializedTransactionSchema>

// ============================================================================
// TRANSACTION API SCHEMAS
// ============================================================================

/**
 * Schema for updating a transaction
 */
export const updateTransactionSchema = z.object({
  name: z.string().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  customCategoryId: z.string().nullable().optional(),
  customSubcategoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
})

export type UpdateTransactionPayload = z.infer<typeof updateTransactionSchema>

/**
 * Schema for bulk updating transactions
 */
export const bulkUpdateTransactionsSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
  customCategoryId: z.string().nullable().optional(),
  customSubcategoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
})

export type BulkUpdateTransactionsPayload = z.infer<typeof bulkUpdateTransactionsSchema>

// ============================================================================
// CATEGORY API SCHEMAS
// ============================================================================

/**
 * Schema for creating a custom category
 */
export const createCustomCategorySchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().nullable().optional(),
})

export type CreateCustomCategoryPayload = z.infer<typeof createCustomCategorySchema>

/**
 * Schema for updating a custom category
 */
export const updateCustomCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().nullable().optional(),
})

export type UpdateCustomCategoryPayload = z.infer<typeof updateCustomCategorySchema>

/**
 * Schema for creating a custom subcategory
 */
export const createCustomSubcategorySchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().nullable().optional(),
})

export type CreateCustomSubcategoryPayload = z.infer<typeof createCustomSubcategorySchema>

/**
 * Schema for custom category with subcategories (API response)
 */
export const customCategoryWithSubcategoriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  subcategories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
})

export type CustomCategoryWithSubcategories = z.infer<
  typeof customCategoryWithSubcategoriesSchema
>

// ============================================================================
// TAG API SCHEMAS
// ============================================================================

/**
 * Schema for creating a tag
 */
export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
})

export type CreateTagPayload = z.infer<typeof createTagSchema>

/**
 * Schema for updating a tag
 */
export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
})

export type UpdateTagPayload = z.infer<typeof updateTagSchema>

/**
 * Schema for tag with count
 */
export const tagWithCountSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    transactions: z.number(),
  }),
})

export type TagWithCount = z.infer<typeof tagWithCountSchema>

// ============================================================================
// ACCOUNT API SCHEMAS
// ============================================================================

/**
 * Schema for serialized account (full details)
 */
export const serializedAccountFullSchema = z.object({
  id: z.string(),
  plaidAccountId: z.string(),
  itemId: z.string(),
  name: z.string(),
  officialName: z.string().nullable(),
  mask: z.string().nullable(),
  type: z.string(),
  subtype: z.string().nullable(),
  currency: z.string().nullable(),
  currentBalance: z.string().nullable(), // Decimal as string
  availableBalance: z.string().nullable(), // Decimal as string
  creditLimit: z.string().nullable(), // Decimal as string
  balanceUpdatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type SerializedAccountFull = z.infer<typeof serializedAccountFullSchema>

// ============================================================================
// PLAID API SCHEMAS
// ============================================================================

/**
 * Schema for link token creation response
 */
export const createLinkTokenResponseSchema = z.object({
  link_token: z.string(),
  expiration: z.string(),
})

export type CreateLinkTokenResponse = z.infer<typeof createLinkTokenResponseSchema>

/**
 * Schema for public token exchange request
 */
export const exchangePublicTokenSchema = z.object({
  public_token: z.string(),
  institution: z.object({
    institution_id: z.string(),
    name: z.string(),
  }),
})

export type ExchangePublicTokenPayload = z.infer<typeof exchangePublicTokenSchema>

// ============================================================================
// HOLDING API SCHEMAS
// ============================================================================

/**
 * Schema for serialized holding
 */
export const serializedHoldingSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  quantity: z.string(), // Decimal as string
  costBasis: z.string().nullable(), // Decimal as string
  institutionPrice: z.string().nullable(), // Decimal as string
  institutionPriceAsOf: z.string().nullable(),
  isoCurrencyCode: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  security: z.object({
    id: z.string(),
    name: z.string().nullable(),
    tickerSymbol: z.string().nullable(),
    type: z.string().nullable(),
    isoCurrencyCode: z.string().nullable(),
    logoUrl: z.string().nullable(),
  }),
})

export type SerializedHolding = z.infer<typeof serializedHoldingSchema>

// ============================================================================
// INVESTMENT TRANSACTION API SCHEMAS
// ============================================================================

/**
 * Schema for serialized investment transaction
 */
export const serializedInvestmentTransactionSchema = z.object({
  id: z.string(),
  plaidInvestmentTransactionId: z.string(),
  accountId: z.string(),
  securityId: z.string().nullable(),
  type: z.string(),
  amount: z.string().nullable(), // Decimal as string
  price: z.string().nullable(), // Decimal as string
  quantity: z.string().nullable(), // Decimal as string
  fees: z.string().nullable(), // Decimal as string
  isoCurrencyCode: z.string().nullable(),
  date: z.string(),
  name: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  account: serializedAccountSchema.nullable(),
  security: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      tickerSymbol: z.string().nullable(),
      type: z.string().nullable(),
      logoUrl: z.string().nullable(),
    })
    .nullable(),
})

export type SerializedInvestmentTransaction = z.infer<
  typeof serializedInvestmentTransactionSchema
>

// ============================================================================
// ANALYTICS API SCHEMAS
// ============================================================================

/**
 * Schema for transaction analytics by category
 */
export const transactionByCategorySchema = z.object({
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  total: z.string(), // Decimal as string
  count: z.number(),
})

export type TransactionByCategory = z.infer<typeof transactionByCategorySchema>

/**
 * Schema for date range query
 */
export const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper to create a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data }
}

/**
 * Helper to create an error response
 */
export function createErrorResponse(error: string, details?: unknown): ApiError {
  return { success: false, error, details }
}

/**
 * Parse and validate request body with Zod schema
 * Throws if validation fails
 */
export async function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json()
  return schema.parse(body)
}

/**
 * Safe parse request body with Zod schema
 * Returns success/error result instead of throwing
 */
export async function safeParseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; error: z.ZodError }
> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Invalid JSON',
        },
      ]),
    }
  }
}
