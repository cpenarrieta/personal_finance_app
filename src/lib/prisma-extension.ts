/**
 * Prisma Client Extension for Auto-Serialization
 *
 * This extension automatically converts Date and Decimal fields to serializable primitives:
 * - Date -> string (ISO format)
 * - Decimal -> number
 *
 * Benefits:
 * - Single source of truth for types
 * - No manual serialization needed
 * - Works seamlessly with Next.js Server Components
 * - Type-safe throughout the entire application
 * - Decimals as numbers allow direct math operations
 */

import { Prisma } from '@prisma/client'

/**
 * Recursively converts Date and Decimal objects to serializable primitives
 * - Date -> string (ISO format)
 * - Decimal -> number
 * This handles nested objects and arrays
 */
function convertDatesAndDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle Prisma Decimal - convert to number
  if (obj instanceof Prisma.Decimal) {
    return obj.toNumber() as T
  }

  // Handle Date - convert to ISO string
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
      async $allOperations({ args, query }) {
        // Execute the query
        const result = await query(args)

        // Convert Date to strings, Decimal to numbers
        return convertDatesAndDecimals(result)
      },
    },
  },
})

/**
 * Type helper to convert Prisma types to their serialized equivalents
 * - Date -> string (ISO format)
 * - Decimal -> number
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Prisma.Decimal
  ? number
  : T extends Array<infer U>
  ? Array<Serialized<U>>
  : T extends object
  ? { [K in keyof T]: Serialized<T[K]> }
  : T

/**
 * Manually serialize data before passing to Client Components
 * Use this when the automatic extension doesn't work (e.g., Server -> Client boundary)
 */
export function serializeForClient<T>(data: T): Serialized<T> {
  return convertDatesAndDecimals(data) as Serialized<T>
}
