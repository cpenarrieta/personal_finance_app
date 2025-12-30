/**
 * Application-wide constants
 *
 * Centralized configuration values to avoid magic numbers and strings
 */

/**
 * Plaid sync configuration
 */
export const SYNC_CONFIG = {
  /** Start date for historical transaction sync (YYYY-MM-DD format) */
  HISTORICAL_START_DATE: "2024-01-01",

  /** Maximum number of transactions to fetch per batch */
  TRANSACTION_BATCH_SIZE: 500,

  /** Delay between API calls to respect rate limits (in milliseconds) */
  API_RATE_LIMIT_DELAY_MS: 12000,

  /** Maximum retries for failed API calls */
  MAX_RETRIES: 3,

  /** Base delay for exponential backoff (in milliseconds) */
  RETRY_DELAY_MS: 1000,
} as const

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  /** Default cache duration in seconds (24 hours) */
  DEFAULT_STALE_TIME: 60 * 60 * 24,

  /** Short cache duration in seconds (5 minutes) */
  SHORT_STALE_TIME: 60 * 5,

  /** Cache tags */
  TAGS: {
    TRANSACTIONS: "transactions",
    ACCOUNTS: "accounts",
    CATEGORIES: "categories",
    TAGS: "tags",
    HOLDINGS: "holdings",
    INVESTMENTS: "investments",
    ITEMS: "items",
    DASHBOARD: "dashboard",
  },
} as const

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size for transaction lists */
  DEFAULT_PAGE_SIZE: 50,

  /** Maximum page size for API requests */
  MAX_PAGE_SIZE: 500,

  /** Default page size for dashboard top expenses */
  DASHBOARD_TOP_EXPENSES: 25,
} as const

/**
 * Transaction split configuration
 */
export const SPLIT_CONFIG = {
  /** Minimum number of splits required */
  MIN_SPLITS: 2,

  /** Tolerance for amount validation (percentage) */
  AMOUNT_TOLERANCE_PERCENT: 0.01,

  /** AI split tag configuration */
  AI_SPLIT_TAG: {
    name: "ai-split",
    color: "#8b5cf6", // Purple
  },
} as const

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Maximum number of categories to show in charts */
  CHART_MAX_CATEGORIES: 10,

  /** Date format for display */
  DATE_FORMAT: "MMM d, yyyy",

  /** Currency format configuration */
  CURRENCY: {
    locale: "en-US",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
} as const
