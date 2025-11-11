// Mock Plaid client for testing
export const mockPlaidClient = {
  transactionsGet: jest.fn(),
  transactionsSync: jest.fn(),
  investmentsHoldingsGet: jest.fn(),
  investmentsTransactionsGet: jest.fn(),
}

export const getPlaidClient = jest.fn(() => mockPlaidClient)
