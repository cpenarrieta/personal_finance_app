/**
 * One-time script to populate Category groupType and displayOrder from hardcoded config
 * Run with: npx tsx scripts/populate-category-order.ts
 */

import { PrismaClient, CategoryGroupType } from "@prisma/client";
import { CATEGORY_GROUPS } from "../src/config/category-groups";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Populating category groupType and displayOrder...");

  const categories = await prisma.category.findMany();
  console.log(`Found ${categories.length} categories`);

  let updatedCount = 0;

  for (const group of CATEGORY_GROUPS) {
    console.log(`\nProcessing group: ${group.type}`);

    for (let i = 0; i < group.order.length; i++) {
      const categoryName = group.order[i];
      const category = categories.find((c) => c.name === categoryName);

      if (category) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            groupType: group.type,
            displayOrder: i,
          },
        });
        console.log(`  ✅ ${categoryName} -> ${group.type} (order: ${i})`);
        updatedCount++;
      } else {
        console.log(`  ⚠️  Category not found in database: ${categoryName}`);
      }
    }
  }

  // Set default groupType for uncategorized categories
  const uncategorized = categories.filter(
    (c) => !CATEGORY_GROUPS.some((g) => g.order.includes(c.name))
  );

  if (uncategorized.length > 0) {
    console.log(`\n⚠️  Found ${uncategorized.length} uncategorized categories:`);
    for (const cat of uncategorized) {
      console.log(`  - ${cat.name} (will default to "Expenses" at bottom)`);
      await prisma.category.update({
        where: { id: cat.id },
        data: {
          groupType: CategoryGroupType.EXPENSES,
          displayOrder: 9999, // Put at end
        },
      });
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} categories`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
