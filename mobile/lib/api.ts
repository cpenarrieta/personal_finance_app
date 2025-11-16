/**
 * Type-safe API client with runtime validation
 *
 * All API calls validate responses against Zod schemas to ensure
 * type safety and catch API contract violations early.
 */

import { config } from '../config'
import {
  transactionsResponseSchema,
  type Transaction,
  type TransactionsResponse,
} from './schemas/transaction'

/**
 * API result type for consistent error handling
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; validationError?: unknown }

/**
 * Fetch transactions from API with validation
 *
 * @param limit - Number of transactions to fetch (max 500)
 * @returns Validated transactions array or error
 *
 * @example
 * ```typescript
 * const result = await fetchTransactions(100)
 * if (result.success) {
 *   console.log(result.data) // Transaction[]
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export async function fetchTransactions(limit = 100): Promise<ApiResult<Transaction[]>> {
  try {
    const response = await fetch(`${config.API_URL}/api/transactions?limit=${limit}`, {
      credentials: 'include', // Include cookies for auth
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const json = await response.json()

    // Validate response against schema
    const parseResult = transactionsResponseSchema.safeParse(json)

    if (!parseResult.success) {
      console.error('API validation error:', parseResult.error)
      return {
        success: false,
        error: 'Invalid API response format',
        validationError: parseResult.error.format(),
      }
    }

    return {
      success: true,
      data: parseResult.data.transactions,
    }
  } catch (error) {
    console.error('Fetch transactions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
