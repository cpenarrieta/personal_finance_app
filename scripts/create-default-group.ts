import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating default category group...')

  // Create the "default" category group
  const defaultGroup = await prisma.categoryGroup.create({
    data: {
      name: "default"
    }
  })
  console.log(`Created category group: ${defaultGroup.name}`)

  // Get all existing custom categories
  const categories = await prisma.customCategory.findMany()
  console.log(`Found ${categories.length} categories to add to the group`)

  // Add all categories to the default group
  for (const category of categories) {
    await prisma.categoryGroupItem.create({
      data: {
        groupId: defaultGroup.id,
        categoryId: category.id
      }
    })
    console.log(`Added category: ${category.name}`)
  }

  console.log('Default category group created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
