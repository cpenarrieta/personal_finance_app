// scripts/sync-transactions.ts
// Run with: npx tsx scripts/sync-transactions.ts
// This script syncs ONLY banking transactions (no investments)

import { syncTransactionsOnly } from "../src/lib/sync/sync"

async function main() {
  console.log("Starting Plaid transaction sync...")
  console.log("Timestamp:", new Date().toISOString())

  try {
    await syncTransactionsOnly()
    console.log("\nTransaction sync completed successfully!")
  } catch (error) {
    console.error("\nTransaction sync failed with error:")
    console.error(error)
    process.exit(1)
  }
}

main()
