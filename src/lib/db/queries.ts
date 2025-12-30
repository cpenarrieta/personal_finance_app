/**
 * @deprecated Import from "@/lib/db/queries" (directory) instead
 *
 * This file re-exports all queries for backward compatibility.
 * Prefer importing directly from the queries directory:
 *
 * @example
 * // Instead of:
 * import { getAllTransactions } from "@/lib/db/queries"
 *
 * // Use:
 * import { getAllTransactions } from "@/lib/db/queries"
 * // (This now imports from queries/index.ts)
 */

export * from "./queries/index"
