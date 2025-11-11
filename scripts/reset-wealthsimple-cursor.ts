import { prisma } from "../src/lib/db/prisma"

async function resetWealthsimpleCursor() {
  const result = await prisma.item.update({
    where: { id: "cmghlyyll00010cbrnadxt7z7" },
    data: { lastTransactionsCursor: null },
    include: { institution: true },
  })

  console.log("✓ Wealthsimple cursor reset")
  console.log(`  Item: ${result.institution?.name || "Wealthsimple"}`)
  console.log(`  Cursor: ${result.lastTransactionsCursor || "NULL"}`)
  console.log("\nNow run: npm run sync")
}

resetWealthsimpleCursor()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
