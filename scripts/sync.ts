// scripts/sync.ts
// Run with: npx tsx scripts/sync.ts

import { syncAllItems } from '../src/lib/sync'

async function main() {
  console.log('Starting Plaid sync...')
  console.log('Timestamp:', new Date().toISOString())

  try {
    await syncAllItems()
    console.log('\nSync completed successfully!')
  } catch (error) {
    console.error('\nSync failed with error:')
    console.error(error)
    process.exit(1)
  }
}

main()
