import { prisma } from "../src/lib/db/prisma";

async function checkCursors() {
  const items = await prisma.item.findMany({
    include: {
      institution: true,
    },
  });

  console.log("\n📋 Current cursor state:\n");

  for (const item of items) {
    console.log(`Institution: ${item.institution?.name || "Unknown"}`);
    console.log(`  Item ID: ${item.id}`);
    console.log(`  Status: ${item.status || "OK"}`);
    console.log(`  Transactions Cursor: ${item.lastTransactionsCursor ? item.lastTransactionsCursor.substring(0, 50) + "..." : "NULL"}`);
    console.log(`  Created: ${item.createdAt.toISOString()}`);
    console.log(`  Updated: ${item.updatedAt.toISOString()}\n`);
  }
}

checkCursors()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
