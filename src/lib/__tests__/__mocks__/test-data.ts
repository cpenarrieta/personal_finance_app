// Test data fixtures for sync service tests

export const mockPlaidAccount = {
  account_id: "test-account-id",
  name: "Test Checking Account",
  official_name: "Test Official Checking",
  mask: "1234",
  type: "depository",
  subtype: "checking",
  balances: {
    current: 1000.00,
    available: 950.00,
    limit: null,
    iso_currency_code: "USD",
  },
};

export const mockPlaidTransaction = {
  transaction_id: "test-transaction-id",
  account_id: "test-account-id",
  amount: 25.50,
  iso_currency_code: "USD",
  date: "2024-01-15",
  authorized_date: "2024-01-14",
  pending: false,
  merchant_name: "Test Coffee Shop",
  name: "Coffee Shop Purchase",
  personal_finance_category: {
    primary: "FOOD_AND_DRINK",
    detailed: "FOOD_AND_DRINK_COFFEE",
  },
  payment_channel: "in store",
  pending_transaction_id: null,
  logo_url: "https://example.com/logo.png",
  personal_finance_category_icon_url: "https://example.com/icon.png",
};

export const mockHistoricalTransactionsResponse = {
  data: {
    transactions: [mockPlaidTransaction],
    total_transactions: 1,
    accounts: [mockPlaidAccount],
  },
};

export const mockTransactionsSyncResponse = {
  data: {
    added: [],
    modified: [],
    removed: [],
    accounts: [mockPlaidAccount],
    next_cursor: "new-cursor-value",
    has_more: false,
  },
};

export const mockTransactionsSyncResponseWithAdded = {
  data: {
    added: [
      {
        ...mockPlaidTransaction,
        transaction_id: "new-transaction-id",
        date: "2024-01-16",
        name: "New Transaction",
        amount: 50.00,
      },
    ],
    modified: [],
    removed: [],
    accounts: [mockPlaidAccount],
    next_cursor: "cursor-after-add",
    has_more: false,
  },
};

export const mockTransactionsSyncResponseWithModified = {
  data: {
    added: [],
    modified: [
      {
        ...mockPlaidTransaction,
        pending: false,
        amount: 26.00,
      },
    ],
    removed: [],
    accounts: [mockPlaidAccount],
    next_cursor: "cursor-after-modify",
    has_more: false,
  },
};

export const mockTransactionsSyncResponseWithRemoved = {
  data: {
    added: [],
    modified: [],
    removed: [
      {
        transaction_id: "removed-transaction-id",
      },
    ],
    accounts: [mockPlaidAccount],
    next_cursor: "cursor-after-remove",
    has_more: false,
  },
};

export const mockDbTransaction = {
  id: "db-transaction-id",
  plaidTransactionId: "test-transaction-id",
  accountId: "db-account-id",
  amount: 25.50,
  isoCurrencyCode: "USD",
  date: new Date("2024-01-15"),
  authorizedDate: new Date("2024-01-14"),
  pending: false,
  merchantName: "Test Coffee Shop",
  name: "Coffee Shop Purchase",
  plaidCategory: "FOOD_AND_DRINK",
  plaidSubcategory: "FOOD_AND_DRINK_COFFEE",
  paymentChannel: "in store",
  pendingTransactionId: null,
  logoUrl: "https://example.com/logo.png",
  categoryIconUrl: "https://example.com/icon.png",
};

// Investment test data
export const mockPlaidSecurity = {
  security_id: "test-security-id",
  name: "Apple Inc.",
  ticker_symbol: "AAPL",
  type: "equity",
  iso_currency_code: "USD",
};

export const mockPlaidHolding = {
  account_id: "test-investment-account-id",
  security_id: "test-security-id",
  quantity: 10.5,
  cost_basis: 1500.00,
  institution_price: 175.50,
  institution_price_as_of: "2024-01-15",
  iso_currency_code: "USD",
};

export const mockPlaidInvestmentTransaction = {
  investment_transaction_id: "test-inv-tx-id",
  account_id: "test-investment-account-id",
  security_id: "test-security-id",
  type: "buy",
  amount: 1000.00,
  price: 150.00,
  quantity: 6.66,
  fees: 5.00,
  iso_currency_code: "USD",
  date: "2024-01-10",
  name: "Buy AAPL",
};

export const mockInvestmentsHoldingsResponse = {
  data: {
    securities: [mockPlaidSecurity],
    holdings: [mockPlaidHolding],
    accounts: [{
      ...mockPlaidAccount,
      account_id: "test-investment-account-id",
      type: "investment",
      subtype: "brokerage",
    }],
  },
};

export const mockInvestmentsTransactionsResponse = {
  data: {
    investment_transactions: [mockPlaidInvestmentTransaction],
    securities: [mockPlaidSecurity],
    accounts: [{
      ...mockPlaidAccount,
      account_id: "test-investment-account-id",
      type: "investment",
      subtype: "brokerage",
    }],
    total_investment_transactions: 1,
  },
};

export const mockDbAccount = {
  id: "db-account-1",
  plaidAccountId: "test-investment-account-id",
  itemId: "test-item-id",
  name: "Test Brokerage",
  officialName: "Test Brokerage Account",
  mask: "5678",
  type: "investment",
  subtype: "brokerage",
};

export const mockDbSecurity = {
  id: "db-security-1",
  plaidSecurityId: "test-security-id",
  name: "Apple Inc.",
  tickerSymbol: "AAPL",
  type: "equity",
  isoCurrencyCode: "USD",
};

export const mockDbHolding = {
  id: "db-holding-1",
  accountId: "db-account-1",
  securityId: "db-security-1",
  quantity: new (require("@prisma/client").Prisma.Decimal)(10.5),
  costBasis: new (require("@prisma/client").Prisma.Decimal)(1500.00),
  institutionPrice: new (require("@prisma/client").Prisma.Decimal)(175.50),
  institutionPriceAsOf: new Date("2024-01-15"),
  isoCurrencyCode: "USD",
  account: mockDbAccount,
  security: mockDbSecurity,
};
