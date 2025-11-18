// lib/plaid.ts (server-only)
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid"

export function getPlaidClient() {
  const config = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
      },
    },
  })
  return new PlaidApi(config)
}

// Re-export commonly used Plaid types for convenience
export type {
  Transaction,
  AccountBase,
  Security,
  Holding,
  InvestmentTransaction,
  RemovedTransaction,
  TransactionsSyncResponse,
  TransactionsGetResponse,
  InvestmentsHoldingsGetResponse,
  InvestmentsTransactionsGetResponse,
  Products,
  CountryCode,
} from "plaid"
