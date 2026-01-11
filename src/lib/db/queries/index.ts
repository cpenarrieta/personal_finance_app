/**
 * Database queries index
 *
 * All cached queries are organized by domain:
 * - transactions: Transaction-related queries
 * - accounts: Account and Plaid item queries
 * - categories: Category and subcategory queries
 * - tags: Tag queries
 * - investments: Holdings and investment transaction queries
 *
 * All queries use Next.js 16 "use cache" directive with cacheLife() and cacheTag()
 */

// Transaction queries
export {
  getAllTransactions,
  getTransactionsForAccount,
  getReviewTransactions,
  getTransactionById,
} from "./transactions"

// Account queries
export { getAllAccounts, getAllAccountsWithInstitution, getAccountById, getAllConnectedItems } from "./accounts"

// Category queries
export { getAllCategories, getAllCategoriesForManagement, getAllCategoriesForMoveTransactions } from "./categories"

// Tag queries
export { getAllTags, getAllTagsWithCounts } from "./tags"

// Investment queries
export {
  getAllHoldings,
  getAllInvestmentTransactions,
  getHoldingsForAccount,
  getInvestmentTransactionsForAccount,
} from "./investments"

// Weekly summary queries
export { getLatestWeeklySummary } from "./weekly-summary"

// Shared select statements
export {
  TRANSACTION_SELECT,
  TRANSACTION_SELECT_MINIMAL,
  ACCOUNT_SELECT_MINIMAL,
  CATEGORY_SELECT,
  SUBCATEGORY_SELECT,
  TAG_SELECT,
  SECURITY_SELECT,
} from "./selects"
