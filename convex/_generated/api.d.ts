/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js"
import type * as categories from "../categories.js"
import type * as dashboard from "../dashboard.js"
import type * as investments from "../investments.js"
import type * as items from "../items.js"
import type * as migrations_cleanup from "../migrations/cleanup.js"
import type * as migrations_import from "../migrations/import.js"
import type * as migrations_validate from "../migrations/validate.js"
import type * as sync from "../sync.js"
import type * as tags from "../tags.js"
import type * as transactions from "../transactions.js"
import type * as weeklySummaries from "../weeklySummaries.js"
import type * as weeklySummary from "../weeklySummary.js"

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server"

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts
  categories: typeof categories
  dashboard: typeof dashboard
  investments: typeof investments
  items: typeof items
  "migrations/cleanup": typeof migrations_cleanup
  "migrations/import": typeof migrations_import
  "migrations/validate": typeof migrations_validate
  sync: typeof sync
  tags: typeof tags
  transactions: typeof transactions
  weeklySummaries: typeof weeklySummaries
  weeklySummary: typeof weeklySummary
}>

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>

export declare const components: {}
