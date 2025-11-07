// scripts/sync-investments.ts
// Run with: npx tsx scripts/sync-investments.ts
// This script syncs ONLY investments (holdings, securities, investment transactions)

import { syncInvestmentsOnly } from '../src/lib/sync/sync'

async function main() {
  console.log('Starting Plaid investment sync...')
  console.log('Timestamp:', new Date().toISOString())

  try {
    await syncInvestmentsOnly()
    console.log('\nInvestment sync completed successfully!')
  } catch (error) {
    console.error('\nInvestment sync failed with error:')
    console.error(error)
    process.exit(1)
  }
}

main()
