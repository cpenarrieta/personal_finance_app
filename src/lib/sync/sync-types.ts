/**
 * Type definitions for the sync service
 */

export interface TransactionSyncStats {
  accountsUpdated: number
  transactionsAdded: number
  transactionsModified: number
  transactionsRemoved: number
  newTransactionIds: string[] // IDs of newly added transactions for categorization
}

export interface InvestmentSyncStats {
  securitiesAdded: number
  holdingsAdded: number
  holdingsUpdated: number
  holdingsRemoved: number
  investmentTransactionsAdded: number
}

export interface SyncStats extends TransactionSyncStats, InvestmentSyncStats {}

export interface SyncOptions {
  syncTransactions?: boolean
  syncInvestments?: boolean
  runAICategorization?: boolean // Enable AI categorization for new transactions
}

/**
 * Creates initial empty transaction sync stats
 */
export function createTransactionSyncStats(): TransactionSyncStats {
  return {
    accountsUpdated: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
    newTransactionIds: [],
  }
}

/**
 * Creates initial empty investment sync stats
 */
export function createInvestmentSyncStats(): InvestmentSyncStats {
  return {
    securitiesAdded: 0,
    holdingsAdded: 0,
    holdingsUpdated: 0,
    holdingsRemoved: 0,
    investmentTransactionsAdded: 0,
  }
}

/**
 * Creates initial empty full sync stats
 */
export function createSyncStats(): SyncStats {
  return {
    ...createTransactionSyncStats(),
    ...createInvestmentSyncStats(),
  }
}
