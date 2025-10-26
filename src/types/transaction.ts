/**
 * Transaction-specific utilities
 *
 * This file previously contained serialization functions, but they are no longer needed
 * thanks to the Prisma extension that automatically serializes Date and Decimal fields.
 *
 * All type definitions are in types/prisma.ts and types/api.ts
 *
 * @deprecated This file is kept for backward compatibility but may be removed in the future
 */

import { PrismaIncludes } from './prisma'

/**
 * Standard transaction include clause for Prisma queries
 * Use this to ensure consistent data fetching across the app
 *
 * @deprecated Use PrismaIncludes.transaction from './prisma' instead
 */
export const TRANSACTION_INCLUDE = PrismaIncludes.transaction

/**
 * Serialization functions are no longer needed!
 * The Prisma extension automatically converts Date → ISO string and Decimal → string
 *
 * Migration guide:
 * - Remove all `serializeTransaction()` calls - just use the Prisma result directly
 * - Remove all `serializeCustomCategory()` calls - use Prisma result directly
 * - Remove all `serializeTag()` calls - use Prisma result directly
 * - Remove all `serializePlaidAccount()` calls - use Prisma result directly
 *
 * Example:
 * BEFORE: const serialized = txs.map(serializeTransaction)
 * AFTER:  const serialized = txs  // Already serialized!
 */
