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
 * All queries use Convex with Next.js 16 "use cache" directive
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
  getHoldingsByTicker,
  getTransactionsByTicker,
} from "./investments"

// Weekly summary queries
export { getLatestWeeklySummary } from "./weekly-summary"
