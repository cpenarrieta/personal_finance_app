/**
 * API request/response types and Zod schemas
 *
 * This file contains:
 * - Zod schemas for runtime validation
 * - TypeScript types inferred from schemas
 * - API response wrappers
 * - Request payload types
 */

import { z } from "zod";

// ============================================================================
// GENERIC API RESPONSE TYPES
// ============================================================================

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  details?: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// TRANSACTION API SCHEMAS
// ============================================================================

/**
 * Schema for creating a manual transaction
 */
export const createTransactionSchema = z.object({
  accountId: z.string(),
  name: z.string().min(1),
  amount: z.number(),
  date: z.string(), // ISO date string
  pending: z.boolean(),
  merchantName: z.string().nullable().optional(),
  isoCurrencyCode: z.string().nullable().optional(),
  authorizedDate: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  paymentChannel: z.string().nullable().optional(),
  customCategoryId: z.string().nullable().optional(),
  customSubcategoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export type CreateTransactionPayload = z.infer<typeof createTransactionSchema>;

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
});

export type UpdateTransactionPayload = z.infer<typeof updateTransactionSchema>;

/**
 * Schema for bulk updating transactions
 */
export const bulkUpdateTransactionsSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
  customCategoryId: z.string().nullable().optional(),
  customSubcategoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export type BulkUpdateTransactionsPayload = z.infer<
  typeof bulkUpdateTransactionsSchema
>;

// ============================================================================
// CATEGORY API SCHEMAS
// ============================================================================

/**
 * Schema for creating a custom category
 */
export const createCustomCategorySchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().nullable().optional(),
});

export type CreateCustomCategoryPayload = z.infer<
  typeof createCustomCategorySchema
>;

/**
 * Schema for updating a custom category
 */
export const updateCustomCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().nullable().optional(),
});

export type UpdateCustomCategoryPayload = z.infer<
  typeof updateCustomCategorySchema
>;

/**
 * Schema for creating a custom subcategory
 */
export const createCustomSubcategorySchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().nullable().optional(),
});

export type CreateCustomSubcategoryPayload = z.infer<
  typeof createCustomSubcategorySchema
>;

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
      categoryId: z.string(),
      name: z.string(),
      imageUrl: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
});

export type CustomCategoryWithSubcategories = z.infer<
  typeof customCategoryWithSubcategoriesSchema
>;

// ============================================================================
// TAG API SCHEMAS
// ============================================================================

/**
 * Schema for creating a tag
 */
export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
});

export type CreateTagPayload = z.infer<typeof createTagSchema>;

/**
 * Schema for updating a tag
 */
export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .optional(),
});

export type UpdateTagPayload = z.infer<typeof updateTagSchema>;

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
});

export type TagWithCount = z.infer<typeof tagWithCountSchema>;

// ============================================================================
// PLAID ACCOUNT API SCHEMAS
// ============================================================================

// ============================================================================
// PLAID API SCHEMAS
// ============================================================================

/**
 * Schema for link token creation response
 */
export const createLinkTokenResponseSchema = z.object({
  link_token: z.string(),
  expiration: z.string(),
});

export type CreateLinkTokenResponse = z.infer<
  typeof createLinkTokenResponseSchema
>;

/**
 * Schema for public token exchange request
 */
export const exchangePublicTokenSchema = z.object({
  public_token: z.string(),
  institution: z.object({
    institution_id: z.string(),
    name: z.string(),
  }),
});

export type ExchangePublicTokenPayload = z.infer<
  typeof exchangePublicTokenSchema
>;

// ============================================================================
// HOLDING API SCHEMAS
// ============================================================================

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
});

export type TransactionByCategory = z.infer<typeof transactionByCategorySchema>;

/**
 * Schema for date range query
 */
export const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper to create a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

/**
 * Helper to create an error response
 */
export function createErrorResponse(
  error: string,
  details?: unknown
): ApiError {
  return { success: false, error, details };
}

/**
 * Parse and validate request body with Zod schema
 * Throws if validation fails
 */
export async function parseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Safe parse request body with Zod schema
 * Returns success/error result instead of throwing
 */
export async function safeParseRequestBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  { success: true; data: z.infer<T> } | { success: false; error: z.ZodError }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Invalid JSON",
        },
      ]),
    };
  }
}
