#!/usr/bin/env npx tsx
/**
 * Updates all existing Plaid items to use webhook URL
 * Run: npx tsx scripts/update-webhooks.ts
 */

import { getPlaidClient } from "../src/lib/api/plaid"
import { prisma } from "../src/lib/db/prisma"

async function main() {
  const webhookUrl = process.env.PLAID_WEBHOOK_URL || `${process.env.BETTER_AUTH_URL}/api/plaid/webhook`

  if (!webhookUrl || webhookUrl.includes("undefined")) {
    console.error("❌ PLAID_WEBHOOK_URL or BETTER_AUTH_URL not set in .env")
    console.error("   Add: PLAID_WEBHOOK_URL=https://penarrietaoria.com/api/plaid/webhook")
    process.exit(1)
  }

  console.log(`🔔 Updating all items to use webhook: ${webhookUrl}\n`)

  const plaid = getPlaidClient()
  const items = await prisma.item.findMany()

  if (items.length === 0) {
    console.log("ℹ️  No items found. Nothing to update.")
    return
  }

  console.log(`Found ${items.length} item(s)\n`)

  for (const item of items) {
    try {
      console.log(`Updating item ${item.plaidItemId}...`)

      await plaid.itemWebhookUpdate({
        access_token: item.accessToken,
        webhook: webhookUrl,
      })

      console.log(`✅ Updated item ${item.plaidItemId}`)
    } catch (error: any) {
      console.error(`❌ Failed to update item ${item.plaidItemId}:`, error.response?.data || error.message)
    }
  }

  console.log("\n✅ Done! All items updated.")
  console.log("\nNext steps:")
  console.log("1. Deploy changes to production")
  console.log("2. Make a transaction or trigger sync to test webhooks")
  console.log("3. Check Plaid Dashboard → Developers → Logs for webhook deliveries")
}

main()
  .catch((e) => {
    console.error("Fatal error:", e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
