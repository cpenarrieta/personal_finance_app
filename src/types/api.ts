/**
 * API request/response types and Zod schemas
 *
 * This file contains:
 * - Zod schemas for runtime validation of API requests
 * - TypeScript types inferred from schemas
 * - API response wrappers
 * - Request payload types
 *
 * NOTE: Response types now use auto-serialized Prisma types from types/prisma.ts
 * No manual serialization schemas needed - Date fields are strings, Decimal fields are numbers
 */

import { z } from "zod";
import type {
  Tag,
  PlaidAccount,
  TransactionWithRelations,
  HoldingWithRelations,
  InvestmentTransactionWithRelations,
} from "./prisma";

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
// SERIALIZED TYPE ALIASES (Auto-serialized via Prisma Extension)
// ============================================================================

/**
 * Serialized types - these are now just aliases to auto-serialized Prisma types
 * Date fields -> strings (ISO format), Decimal fields -> numbers
 */

export type SerializedTag = Tag;
export type SerializedPlaidAccount = PlaidAccount;
export type SerializedPlaidAccountFull = PlaidAccount;
export type SerializedTransaction = TransactionWithRelations;
export type SerializedHolding = HoldingWithRelations;
export type SerializedInvestmentTransaction =
  InvestmentTransactionWithRelations;

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
 * Custom category with subcategories (API response)
 * Now uses auto-serialized Prisma type - no Zod schema needed
 */
export type { CustomCategoryWithSubcategories } from "./prisma";

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
 * Tag with count (API response)
 * Now uses auto-serialized Prisma type - no Zod schema needed
 */
export type { TagWithCount } from "./prisma";

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

/**
 * Serialized holding (API response)
 * Now uses auto-serialized Prisma type - no Zod schema needed
 */
// Type already exported above as SerializedHolding = HoldingWithRelations

// ============================================================================
// INVESTMENT TRANSACTION API SCHEMAS
// ============================================================================

/**
 * Serialized investment transaction (API response)
 * Now uses auto-serialized Prisma type - no Zod schema needed
 */
// Type already exported above as SerializedInvestmentTransaction = InvestmentTransactionWithRelations

// ============================================================================
// ANALYTICS API SCHEMAS
// ============================================================================

/**
 * Schema for transaction analytics by category
 */
export const transactionByCategorySchema = z.object({
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  total: z.number(), // Decimal as number
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
