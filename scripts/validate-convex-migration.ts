// scripts/validate-convex-migration.ts
// Run with: npx tsx scripts/validate-convex-migration.ts
// Validates the Convex migration against expected counts

import "dotenv/config"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../convex/_generated/api"
import * as fs from "fs"
import * as path from "path"

const EXPORT_DIR = path.join(process.cwd(), "convex-migration-data")

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

async function main() {
  console.log("Validating Convex migration...")
  console.log("-----------------------------------")

  // 1. Get current counts
  console.log("\n=== Current Counts ===")
  const counts = await client.query(api.migrations.validate.getCounts, {})
  console.log(JSON.stringify(counts, null, 2))

  // 2. Compare with expected counts
  console.log("\n=== Count Comparison ===")
  const expectedCountsPath = path.join(EXPORT_DIR, "_expected_counts.json")

  if (fs.existsSync(expectedCountsPath)) {
    const expected = JSON.parse(fs.readFileSync(expectedCountsPath, "utf-8"))
    const comparison = await client.query(api.migrations.validate.compareCounts, { expected })

    if (comparison.allMatch) {
      console.log("All counts match expected values!")
    } else {
      console.log("Count mismatches found:")
      for (const [table, result] of Object.entries(comparison.comparison)) {
        const r = result as { expected: number; actual: number; match: boolean }
        if (!r.match) {
          console.log(`  ${table}: expected ${r.expected}, got ${r.actual}`)
        }
      }
    }
  } else {
    console.log("No expected counts file found. Skipping comparison.")
  }

  // 3. Validate relationships
  console.log("\n=== Relationship Validation ===")
  const validation = await client.query(api.migrations.validate.validateRelationships, {})

  if (validation.valid) {
    console.log("All relationships are valid!")
  } else {
    console.log("Relationship issues found:")
    for (const issue of validation.issues) {
      console.log(`  - ${issue}`)
    }
  }

  // 4. Sample data
  console.log("\n=== Sample Transactions ===")
  const samples = await client.query(api.migrations.validate.getSampleTransactions, { limit: 3 })
  for (const tx of samples) {
    console.log(`\n  ${tx.name}`)
    console.log(`    ID: ${tx._id}`)
    console.log(`    Plaid ID: ${tx.plaidTransactionId}`)
    console.log(`    Amount: $${tx.amount.toFixed(2)}`)
    console.log(`    Date: ${tx.datetime}`)
    console.log(`    Account: ${tx.account?.name ?? "N/A"} (${tx.account?.type ?? "N/A"})`)
    console.log(`    Category: ${tx.category?.name ?? "Uncategorized"}`)
    console.log(`    Subcategory: ${tx.subcategory?.name ?? "N/A"}`)
  }

  // 5. ID Mappings status
  console.log("\n=== ID Mappings Table ===")
  const mappingsInfo = await client.query(api.migrations.validate.getIdMappingsCount, {})
  console.log(`Total mappings: ${mappingsInfo.total}`)
  console.log("By table:")
  for (const [table, count] of Object.entries(mappingsInfo.byTable)) {
    console.log(`  ${table}: ${count}`)
  }

  console.log("\n-----------------------------------")
  console.log("Validation complete!")

  if (!validation.valid) {
    console.log("\nWARNING: Some relationship issues were found. Review before proceeding.")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Validation failed:", error)
  process.exit(1)
})
