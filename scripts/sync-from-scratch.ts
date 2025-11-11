// scripts/sync-from-scratch.ts
// Run with: npx tsx scripts/sync-from-scratch.ts
// This script clears the cursor and re-syncs all data from scratch

import { syncAllItems } from "../src/lib/sync/sync"
import { prisma } from "../src/lib/db/prisma"

async function main() {
  console.log("🔄 Starting fresh sync from scratch...")
  console.log("Timestamp:", new Date().toISOString())
  console.log("")

  try {
    // Step 1: Clear all cursors
    console.log("📝 Clearing transaction cursors...")
    const result = await prisma.item.updateMany({
      data: {
        lastTransactionsCursor: null,
        lastInvestmentsCursor: null,
      },
    })
    console.log(`✅ Cleared cursors for ${result.count} item(s)`)
    console.log("")

    // Step 2: Run full sync
    console.log("🔄 Running full sync...")
    await syncAllItems()

    console.log("")
    console.log("✅ Fresh sync completed successfully!")
  } catch (error) {
    console.error("\n❌ Sync failed with error:")
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
