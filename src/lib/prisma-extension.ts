/**
 * Prisma Client Extension for Auto-Serialization
 *
 * This extension automatically converts Date and Decimal fields to strings
 * so we don't need separate "Serialized" types throughout the application.
 *
 * Benefits:
 * - Single source of truth for types
 * - No manual serialization needed
 * - Works seamlessly with Next.js Server Components
 * - Type-safe throughout the entire application
 */

import { Prisma } from '@prisma/client'

/**
 * Recursively converts Date and Decimal objects to strings
 * This handles nested objects and arrays
 */
function convertDatesAndDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle Prisma Decimal
  if (obj instanceof Prisma.Decimal) {
    return obj.toString() as T
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString() as T
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => convertDatesAndDecimals(item)) as T
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertDatesAndDecimals(value)
    }
    return converted as T
  }

  return obj
}

/**
 * Prisma extension that automatically serializes Date and Decimal fields
 * Apply this to your PrismaClient to get automatic serialization
 */
export const serializationExtension = Prisma.defineExtension({
  name: 'serialization',
  query: {
    $allModels: {
      // Hook into all query operations
      async $allOperations({ operation, model, args, query }) {
        // Execute the query
        const result = await query(args)

        // Convert all Date and Decimal fields to strings
        return convertDatesAndDecimals(result)
      },
    },
  },
})

/**
 * Type helper to convert Prisma types to their serialized equivalents
 * This ensures TypeScript knows that Date fields are now strings
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Prisma.Decimal
  ? string
  : T extends Array<infer U>
  ? Array<Serialized<U>>
  : T extends object
  ? { [K in keyof T]: Serialized<T[K]> }
  : T
