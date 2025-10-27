import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addOtherSubcategories() {
  try {
    // Get all categories
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
      },
    });

    console.log(`Found ${categories.length} categories\n`);

    for (const category of categories) {
      // Check if "Other" subcategory already exists for this category
      const hasOther = category.subcategories.some(
        sub => sub.name.toLowerCase() === 'other'
      );

      if (hasOther) {
        console.log(`✓ Category "${category.name}" already has an "Other" subcategory`);
        continue;
      }

      // Create "Other" subcategory
      await prisma.subcategory.create({
        data: {
          categoryId: category.id,
          name: 'Other',
          imageUrl: null,
        },
      });

      console.log(`✓ Added "Other" subcategory to "${category.name}"`);
    }

    console.log('\n✅ Done! All categories now have an "Other" subcategory.');
  } catch (error) {
    console.error('Error adding "Other" subcategories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addOtherSubcategories();
