// /**
//  * Cleanup script to remove duplicate Plaid items and accounts
//  *
//  * This script identifies and removes duplicate items that were created
//  * due to incorrect reauth flow (using new item mode instead of update mode)
//  *
//  * IMPORTANT: Run this BEFORE syncing to avoid transaction complications
//  */

// import { prisma } from "../src/lib/db/prisma"

// async function cleanupDuplicates() {
//   console.log("🔍 Finding duplicate items...\n")

//   // Get all items with their accounts
//   const items = await prisma.item.findMany({
//     include: {
//       accounts: {
//         include: {
//           _count: {
//             select: { transactions: true },
//           },
//         },
//       },
//       institution: true,
//     },
//     orderBy: { createdAt: "asc" },
//   })

//   // Group by institution
//   const itemsByInstitution = new Map<string, typeof items>()
//   for (const item of items) {
//     const instId = item.institutionId || "unknown"
//     if (!itemsByInstitution.has(instId)) {
//       itemsByInstitution.set(instId, [])
//     }
//     itemsByInstitution.get(instId)!.push(item)
//   }

//   // Find duplicates
//   const duplicatesToDelete: typeof items = []
//   for (const [instId, instItems] of itemsByInstitution.entries()) {
//     if (instItems.length > 1) {
//       console.log(`\n📋 Institution: ${instItems[0].institution?.name || instId}`)
//       console.log(`   Found ${instItems.length} items:\n`)

//       instItems.forEach((item: (typeof items)[0], idx: number) => {
//         const txCount = item.accounts.reduce(
//           (sum: number, acc: (typeof item.accounts)[0]) => sum + acc._count.transactions,
//           0,
//         )
//         console.log(`   ${idx + 1}. Item ID: ${item.id.substring(0, 12)}...`)
//         console.log(`      Created: ${item.createdAt.toISOString()}`)
//         console.log(`      Status: ${item.status || "OK"}`)
//         console.log(`      Accounts: ${item.accounts.length}`)
//         console.log(`      Total Transactions: ${txCount}`)
//       })

//       // The newest item with 0 transactions is likely the duplicate
//       type MappedItem = {
//         item: (typeof items)[0]
//         txCount: number
//         originalIndex: number
//       }

//       const sorted = instItems
//         .map(
//           (item: (typeof items)[0], idx: number): MappedItem => ({
//             item,
//             txCount: item.accounts.reduce(
//               (sum: number, acc: (typeof item.accounts)[0]) => sum + acc._count.transactions,
//               0,
//             ),
//             originalIndex: idx,
//           }),
//         )
//         .sort((a: MappedItem, b: MappedItem) => b.item.createdAt.getTime() - a.item.createdAt.getTime())

//       const newest = sorted[0]
//       if (newest.txCount === 0 && sorted.length > 1) {
//         console.log(`\n   ⚠️  Marking newest item (${newest.originalIndex + 1}) as duplicate (0 transactions)`)
//         duplicatesToDelete.push(newest.item)
//       } else {
//         console.log(`\n   ℹ️  Cannot auto-detect duplicate - manual review needed`)
//       }
//     }
//   }

//   if (duplicatesToDelete.length === 0) {
//     console.log("\n✅ No duplicates found that can be safely deleted.\n")
//     return
//   }

//   console.log(`\n\n🗑️  Found ${duplicatesToDelete.length} duplicate(s) to delete:\n`)

//   for (const item of duplicatesToDelete) {
//     console.log(`   - ${item.institution?.name || "Unknown"}`)
//     console.log(`     Item ID: ${item.id}`)
//     console.log(`     Accounts to delete: ${item.accounts.length}\n`)
//   }

//   console.log("⚠️  THIS ACTION CANNOT BE UNDONE")
//   console.log("⚠️  Make sure to review the list above before confirming\n")

//   // In a real scenario, you'd want user confirmation here
//   // For now, we'll just show what would be deleted

//   console.log("Proceeding with deletion...\n")

//   for (const item of duplicatesToDelete) {
//     console.log(`\n🗑️  Deleting item: ${item.institution?.name}`)

//     // Delete accounts (will fail if they have transactions - that's good!)
//     for (const account of item.accounts) {
//       try {
//         await prisma.plaidAccount.delete({
//           where: { id: account.id },
//         })
//         console.log(`   ✓ Deleted account: ${account.name}`)
//       } catch (error: any) {
//         console.error(`   ✗ Failed to delete account ${account.name}:`)
//         console.error(`     ${error.message}`)
//         console.error(`     This account likely has transactions. Please review manually.`)
//         throw error // Stop execution to prevent orphaned item
//       }
//     }

//     // Delete the item itself
//     await prisma.item.delete({
//       where: { id: item.id },
//     })
//     console.log(`   ✓ Deleted item\n`)
//   }

//   console.log("✅ Cleanup complete!\n")
// }

// cleanupDuplicates()
//   .catch((error) => {
//     console.error("\n❌ Cleanup failed:")
//     console.error(error)
//     process.exit(1)
//   })
//   .finally(() => {
//     prisma.$disconnect()
//   })
