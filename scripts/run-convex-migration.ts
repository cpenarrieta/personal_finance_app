// scripts/run-convex-migration.ts
// Run with: npx tsx scripts/run-convex-migration.ts
// Imports exported Prisma data into Convex

import "dotenv/config"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import * as fs from "fs"
import * as path from "path"

const EXPORT_DIR = path.join(process.cwd(), "convex-migration-data")

// Batch size for imports (Convex has limits on mutation size)
const BATCH_SIZE = 100

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

function readExport<T>(tableName: string): T[] {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`)
  if (!fs.existsSync(filePath)) {
    console.log(`No export file for ${tableName}, skipping`)
    return []
  }
  const content = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(content) as T[]
}

// Split array into batches
function batch<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size))
  }
  return batches
}

async function importTable<T>(
  tableName: string,
  importFn: (data: T[]) => Promise<{ imported: number; skipped?: number }>,
) {
  const data = readExport<T>(tableName)
  if (data.length === 0) {
    console.log(`${tableName}: No data to import`)
    return { imported: 0, skipped: 0 }
  }

  console.log(`${tableName}: Importing ${data.length} rows...`)
  const batches = batch(data, BATCH_SIZE)
  let totalImported = 0
  let totalSkipped = 0

  for (let i = 0; i < batches.length; i++) {
    const result = await importFn(batches[i]!)
    totalImported += result.imported
    totalSkipped += result.skipped ?? 0
    console.log(`  Batch ${i + 1}/${batches.length}: ${result.imported} imported, ${result.skipped ?? 0} skipped`)
  }

  console.log(`${tableName}: Done - ${totalImported} imported, ${totalSkipped} skipped`)
  return { imported: totalImported, skipped: totalSkipped }
}

async function main() {
  console.log("Starting Convex migration...")
  console.log(`Reading from: ${EXPORT_DIR}`)
  console.log("-----------------------------------")

  // Verify export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error("Export directory not found! Run export-to-convex.ts first.")
    process.exit(1)
  }

  const results: Record<string, { imported: number; skipped: number }> = {}

  // ============================================================================
  // PHASE 1: Independent tables (no foreign keys)
  // ============================================================================
  console.log("\n=== Phase 1: Independent tables ===")

  results.institutions = await importTable("institutions", (data) =>
    client.mutation(api.migrations.import.importInstitutions, { data }),
  )

  results.categories = await importTable("categories", (data) =>
    client.mutation(api.migrations.import.importCategories, { data }),
  )

  results.tags = await importTable("tags", (data) => client.mutation(api.migrations.import.importTags, { data }))

  results.users = await importTable("users", (data) => client.mutation(api.migrations.import.importUsers, { data }))

  results.weeklySummaries = await importTable("weeklySummaries", (data) =>
    client.mutation(api.migrations.import.importWeeklySummaries, { data }),
  )

  results.verifications = await importTable("verifications", (data) =>
    client.mutation(api.migrations.import.importVerifications, { data }),
  )

  // ============================================================================
  // PHASE 2: First-level dependencies
  // ============================================================================
  console.log("\n=== Phase 2: First-level dependencies ===")

  results.subcategories = await importTable("subcategories", (data) =>
    client.mutation(api.migrations.import.importSubcategories, { data }),
  )

  results.items = await importTable("items", (data) => client.mutation(api.migrations.import.importItems, { data }))

  results.sessions = await importTable("sessions", (data) =>
    client.mutation(api.migrations.import.importSessions, { data }),
  )

  results.oauthAccounts = await importTable("oauthAccounts", (data) =>
    client.mutation(api.migrations.import.importOAuthAccounts, { data }),
  )

  results.passkeys = await importTable("passkeys", (data) =>
    client.mutation(api.migrations.import.importPasskeys, { data }),
  )

  // ============================================================================
  // PHASE 3: Second-level dependencies
  // ============================================================================
  console.log("\n=== Phase 3: Second-level dependencies ===")

  results.accounts = await importTable("accounts", (data) =>
    client.mutation(api.migrations.import.importAccounts, { data }),
  )

  results.securities = await importTable("securities", (data) =>
    client.mutation(api.migrations.import.importSecurities, { data }),
  )

  // ============================================================================
  // PHASE 4: Third-level dependencies
  // ============================================================================
  console.log("\n=== Phase 4: Third-level dependencies ===")

  results.transactions = await importTable("transactions", (data) =>
    client.mutation(api.migrations.import.importTransactions, { data }),
  )

  results.holdings = await importTable("holdings", (data) =>
    client.mutation(api.migrations.import.importHoldings, { data }),
  )

  results.investmentTransactions = await importTable("investmentTransactions", (data) =>
    client.mutation(api.migrations.import.importInvestmentTransactions, { data }),
  )

  // ============================================================================
  // PHASE 5: Junction tables
  // ============================================================================
  console.log("\n=== Phase 5: Junction tables ===")

  results.transactionTags = await importTable("transactionTags", (data) =>
    client.mutation(api.migrations.import.importTransactionTags, { data }),
  )

  // ============================================================================
  // PHASE 6: Second pass - parent transaction references
  // ============================================================================
  console.log("\n=== Phase 6: Parent transaction references ===")

  const transactions = readExport<{
    _oldId: string
    _oldParentTransactionId: string | null
  }>("transactions")

  const parentMappings = transactions
    .filter((t) => t._oldParentTransactionId)
    .map((t) => ({
      oldId: t._oldId,
      oldParentId: t._oldParentTransactionId!,
    }))

  if (parentMappings.length > 0) {
    console.log(`Updating ${parentMappings.length} parent transaction references...`)
    const batches = batch(parentMappings, BATCH_SIZE)
    let totalUpdated = 0
    let totalSkipped = 0

    for (let i = 0; i < batches.length; i++) {
      const result = await client.mutation(api.migrations.import.updateParentTransactionRefs, {
        mappings: batches[i],
      })
      totalUpdated += result.updated
      totalSkipped += result.skipped
      console.log(`  Batch ${i + 1}/${batches.length}: ${result.updated} updated, ${result.skipped} skipped`)
    }

    results.parentTransactionRefs = { imported: totalUpdated, skipped: totalSkipped }
  } else {
    console.log("No parent transaction references to update")
    results.parentTransactionRefs = { imported: 0, skipped: 0 }
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n=== Migration Summary ===")
  console.log(JSON.stringify(results, null, 2))

  // Write results
  const resultsPath = path.join(EXPORT_DIR, "_migration_results.json")
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`\nResults saved to: ${resultsPath}`)
}

main().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
