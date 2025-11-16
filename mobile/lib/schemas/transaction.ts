/**
 * Zod schemas for Transaction API responses
 *
 * These schemas validate API responses from GET /api/transactions
 * See: src/app/api/transactions/route.ts:13-90
 */

import { z } from 'zod'

/**
 * Category schema (nested in transaction)
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  isTransferCategory: z.boolean().optional(),
})

export type Category = z.infer<typeof categorySchema>

/**
 * Subcategory schema (nested in transaction)
 */
export const subcategorySchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
})

export type Subcategory = z.infer<typeof subcategorySchema>

/**
 * Account schema (nested in transaction)
 */
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  mask: z.string().nullable(),
})

export type Account = z.infer<typeof accountSchema>

/**
 * Tag schema (nested in transaction)
 */
export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
})

export type Tag = z.infer<typeof tagSchema>

/**
 * Transaction tag wrapper (how tags are nested in API response)
 */
export const transactionTagSchema = z.object({
  tag: tagSchema,
})

export type TransactionTag = z.infer<typeof transactionTagSchema>

/**
 * Full transaction schema matching API response structure
 * GET /api/transactions returns this shape
 */
export const transactionSchema = z.object({
  id: z.string(),
  plaidTransactionId: z.string().nullable().optional(),
  accountId: z.string(),
  amount_number: z.number(), // Generated column (Decimal → Float)
  isoCurrencyCode: z.string().nullable(),
  date_string: z.string(), // Generated column (Date → String)
  authorized_date_string: z.string().nullable().optional(),
  pending: z.boolean(),
  merchantName: z.string().nullable(),
  name: z.string(),
  plaidCategory: z.string().nullable().optional(),
  plaidSubcategory: z.string().nullable().optional(),
  paymentChannel: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  categoryIconUrl: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isSplit: z.boolean().optional(),
  isManual: z.boolean().optional(),
  created_at_string: z.string().optional(),
  updated_at_string: z.string().optional(),
  account: accountSchema,
  category: categorySchema.nullable(),
  subcategory: subcategorySchema.nullable().optional(),
  tags: z.array(transactionTagSchema),
})

export type Transaction = z.infer<typeof transactionSchema>

/**
 * API response schema for GET /api/transactions
 */
export const transactionsResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  count: z.number(),
})

export type TransactionsResponse = z.infer<typeof transactionsResponseSchema>
