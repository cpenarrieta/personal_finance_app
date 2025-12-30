// /**
//  * DANGEROUS: Delete an Item and ALL its data (accounts, transactions, etc.)
//  *
//  * Only use this if you're certain you want to remove an institution completely
//  * and start fresh. All transaction history, custom categories, notes, tags will be lost.
//  *
//  * Usage: npm run delete:item -- <itemId>
//  */

// import { prisma } from "../src/lib/db/prisma"

// const itemId = process.argv[2]

// if (!itemId) {
//   console.error("❌ Error: Item ID required")
//   console.error("Usage: npm run delete:item -- <itemId>")
//   process.exit(1)
// }

// async function deleteItemAndData() {
//   console.log(`🔍 Finding item: ${itemId}\n`)

//   const item = await prisma.item.findUnique({
//     where: { id: itemId },
//     include: {
//       institution: true,
//       accounts: {
//         include: {
//           _count: {
//             select: {
//               transactions: true,
//               holdings: true,
//               investmentTransactions: true,
//             },
//           },
//         },
//       },
//     },
//   })

//   if (!item) {
//     console.error(`❌ Item not found: ${itemId}`)
//     process.exit(1)
//   }

//   const totalTx = item.accounts.reduce(
//     (sum: number, acc: (typeof item.accounts)[0]) => sum + acc._count.transactions,
//     0,
//   )
//   const totalHoldings = item.accounts.reduce(
//     (sum: number, acc: (typeof item.accounts)[0]) => sum + acc._count.holdings,
//     0,
//   )
//   const totalInvTx = item.accounts.reduce(
//     (sum: number, acc: (typeof item.accounts)[0]) => sum + acc._count.investmentTransactions,
//     0,
//   )

//   console.log(`📋 Item: ${item.institution?.name || "Unknown"}`)
//   console.log(`   Item ID: ${item.id}`)
//   console.log(`   Status: ${item.status || "OK"}`)
//   console.log(`   Accounts: ${item.accounts.length}`)
//   console.log(`   Transactions: ${totalTx}`)
//   console.log(`   Holdings: ${totalHoldings}`)
//   console.log(`   Investment Transactions: ${totalInvTx}`)

//   console.log(`\n⚠️  WARNING: This will DELETE:`)
//   console.log(`   - ${item.accounts.length} account(s)`)
//   console.log(`   - ${totalTx} transaction(s) with ALL custom data`)
//   console.log(`   - ${totalHoldings} holding(s)`)
//   console.log(`   - ${totalInvTx} investment transaction(s)`)
//   console.log(`\n⚠️  THIS ACTION CANNOT BE UNDONE`)
//   console.log(`⚠️  All categories, notes, tags, splits will be LOST\n`)

//   console.log("Proceeding with deletion...\n")

//   // Delete in order: transactions → holdings → inv transactions → accounts → item

//   for (const account of item.accounts) {
//     console.log(`\n🗑️  Deleting account: ${account.name}`)

//     // Delete transactions
//     if (account._count.transactions > 0) {
//       await prisma.transaction.deleteMany({
//         where: { accountId: account.id },
//       })
//       console.log(`   ✓ Deleted ${account._count.transactions} transaction(s)`)
//     }

//     // Delete holdings
//     if (account._count.holdings > 0) {
//       await prisma.holding.deleteMany({
//         where: { accountId: account.id },
//       })
//       console.log(`   ✓ Deleted ${account._count.holdings} holding(s)`)
//     }

//     // Delete investment transactions
//     if (account._count.investmentTransactions > 0) {
//       await prisma.investmentTransaction.deleteMany({
//         where: { accountId: account.id },
//       })
//       console.log(`   ✓ Deleted ${account._count.investmentTransactions} investment transaction(s)`)
//     }

//     // Delete account
//     await prisma.plaidAccount.delete({
//       where: { id: account.id },
//     })
//     console.log(`   ✓ Deleted account`)
//   }

//   // Delete item
//   await prisma.item.delete({
//     where: { id: itemId },
//   })
//   console.log(`\n✓ Deleted item\n`)

//   console.log("✅ Deletion complete!\n")
// }

// deleteItemAndData()
//   .catch((error) => {
//     console.error("\n❌ Deletion failed:")
//     console.error(error)
//     process.exit(1)
//   })
//   .finally(() => {
//     prisma.$disconnect()
//   })
