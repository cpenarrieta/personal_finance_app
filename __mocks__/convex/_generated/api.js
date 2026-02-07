// Mock for convex/_generated/api
// This mock provides string placeholders for all Convex API methods
// The actual implementations are mocked in jest.setup.js via convex/nextjs mocks

module.exports = {
  api: {
    transactions: {
      getAll: 'transactions:getAll',
      getById: 'transactions:getById',
      create: 'transactions:create',
      update: 'transactions:update',
      delete: 'transactions:delete',
      bulkUpdate: 'transactions:bulkUpdate',
      updateTransactionTags: 'transactions:updateTransactionTags',
    },
    accounts: {
      getAll: 'accounts:getAll',
      getById: 'accounts:getById',
    },
    categories: {
      getAll: 'categories:getAll',
      getById: 'categories:getById',
      updateOrder: 'categories:updateOrder',
    },
    tags: {
      getAll: 'tags:getAll',
      getById: 'tags:getById',
    },
    investments: {
      getAll: 'investments:getAll',
    },
    items: {
      getAll: 'items:getAll',
      getByPlaidId: 'items:getByPlaidId',
      getAccessToken: 'items:getAccessToken',
    },
    sync: {
      // Items
      getAllItems: 'sync:getAllItems',
      getItemByPlaidId: 'sync:getItemByPlaidId',
      getItemWithInstitution: 'sync:getItemWithInstitution',
      updateItemStatus: 'sync:updateItemStatus',
      updateItemCursor: 'sync:updateItemCursor',
      // Accounts
      getAccountByPlaidId: 'sync:getAccountByPlaidId',
      getAccountsByItemId: 'sync:getAccountsByItemId',
      upsertAccount: 'sync:upsertAccount',
      // Transactions
      findTransactionByPlaidId: 'sync:findTransactionByPlaidId',
      findTransactionByOriginalId: 'sync:findTransactionByOriginalId',
      findTransactionForSync: 'sync:findTransactionForSync',
      upsertTransaction: 'sync:upsertTransaction',
      updateTransactionByPlaidId: 'sync:updateTransactionByPlaidId',
      deleteRemovedTransactions: 'sync:deleteRemovedTransactions',
      // Tags
      getOrCreateReviewTags: 'sync:getOrCreateReviewTags',
      addTagsToTransaction: 'sync:addTagsToTransaction',
      // Securities
      getAllSecuritiesWithTickers: 'sync:getAllSecuritiesWithTickers',
      getSecurityByPlaidId: 'sync:getSecurityByPlaidId',
      upsertSecurity: 'sync:upsertSecurity',
      updateSecurityLogo: 'sync:updateSecurityLogo',
      // Holdings
      getHoldingsByAccountIds: 'sync:getHoldingsByAccountIds',
      getHoldingByAccountAndSecurity: 'sync:getHoldingByAccountAndSecurity',
      deleteHolding: 'sync:deleteHolding',
      upsertHolding: 'sync:upsertHolding',
      updateHoldingPrices: 'sync:updateHoldingPrices',
      // Investment Transactions
      findInvestmentTransactionByPlaidId: 'sync:findInvestmentTransactionByPlaidId',
      upsertInvestmentTransaction: 'sync:upsertInvestmentTransaction',
      // Categories
      getAllCategoriesWithSubcategories: 'sync:getAllCategoriesWithSubcategories',
      getRecentCategorizedTransactions: 'sync:getRecentCategorizedTransactions',
      getSimilarTransactions: 'sync:getSimilarTransactions',
      getTransactionForCategorization: 'sync:getTransactionForCategorization',
      getUncategorizedTransactions: 'sync:getUncategorizedTransactions',
      applyCategorization: 'sync:applyCategorization',
      getTransactionForSmartAnalysis: 'sync:getTransactionForSmartAnalysis',
    },
    plaidItems: {
      getAll: 'plaidItems:getAll',
      getByItemId: 'plaidItems:getByItemId',
      updateSyncCursor: 'plaidItems:updateSyncCursor',
    },
    dashboard: {
      getStats: 'dashboard:getStats',
    },
  },
  internal: {},
  components: {},
};
