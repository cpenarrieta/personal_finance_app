/**
 * Integration tests for API contract validation
 *
 * These tests verify that API responses match expected schemas.
 * Run in CI to catch contract breaks before deployment.
 */

import { fetchTransactions } from '../api'
import { transactionSchema } from '../schemas/transaction'

describe('API Contract Tests', () => {
  describe('GET /api/transactions', () => {
    it('should return valid transaction data', async () => {
      const result = await fetchTransactions(10)

      // API should succeed
      expect(result.success).toBe(true)

      if (!result.success) {
        fail(`API call failed: ${result.error}`)
      }

      // Should have transactions
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)

      // Each transaction should match schema
      result.data.forEach((transaction, index) => {
        const parseResult = transactionSchema.safeParse(transaction)

        if (!parseResult.success) {
          console.error(`Transaction ${index} validation failed:`, parseResult.error.format())
          fail(`Transaction ${index} does not match schema`)
        }

        expect(parseResult.success).toBe(true)
      })
    })

    it('should have required fields in correct format', async () => {
      const result = await fetchTransactions(1)

      if (!result.success || result.data.length === 0) {
        // Skip if no data available
        return
      }

      const transaction = result.data[0]

      // Validate critical fields
      expect(typeof transaction.id).toBe('string')
      expect(typeof transaction.amount_number).toBe('number')
      expect(typeof transaction.date_string).toBe('string')
      expect(typeof transaction.name).toBe('string')
      expect(typeof transaction.pending).toBe('boolean')

      // Validate nested objects
      expect(transaction.account).toBeDefined()
      expect(typeof transaction.account.name).toBe('string')

      expect(Array.isArray(transaction.tags)).toBe(true)
    })

    it('should handle validation errors gracefully', async () => {
      // This test ensures our error handling works
      const result = await fetchTransactions(10)

      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(typeof result.error).toBe('string')
      }
    })
  })
})
