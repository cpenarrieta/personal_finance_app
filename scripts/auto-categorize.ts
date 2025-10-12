import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to extract keywords from category/subcategory names
function extractKeywords(text: string): string[] {
  // Remove emojis and clean up text
  const cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()
  // Split by common separators and get individual words
  return cleaned
    .toLowerCase()
    .split(/[,\s\(\)&\/]+/)
    .filter(word => word.length > 2) // Filter out very short words
}

// Calculate match score between transaction data and category keywords
function calculateMatchScore(
  transactionData: string[],
  categoryKeywords: string[]
): number {
  let matches = 0
  let totalKeywords = categoryKeywords.length

  for (const keyword of categoryKeywords) {
    for (const data of transactionData) {
      if (data.toLowerCase().includes(keyword)) {
        matches++
        break // Count each keyword match only once
      }
    }
  }

  return totalKeywords > 0 ? (matches / totalKeywords) * 100 : 0
}

// Find best matching category and subcategory
function findBestMatch(
  transactionText: string[],
  categories: Array<{
    id: string
    name: string
    subcategories: Array<{ id: string; name: string }>
  }>
): { categoryId: string | null; subcategoryId: string | null; confidence: number } {
  let bestCategoryId: string | null = null
  let bestSubcategoryId: string | null = null
  let bestScore = 0

  for (const category of categories) {
    const categoryKeywords = extractKeywords(category.name)
    const categoryScore = calculateMatchScore(transactionText, categoryKeywords)

    // Check subcategories
    for (const subcategory of category.subcategories) {
      const subcategoryKeywords = extractKeywords(subcategory.name)
      const subcategoryScore = calculateMatchScore(transactionText, subcategoryKeywords)

      // Combined score: subcategory match is more important
      const combinedScore = subcategoryScore * 0.7 + categoryScore * 0.3

      if (combinedScore > bestScore) {
        bestScore = combinedScore
        bestCategoryId = category.id
        bestSubcategoryId = subcategory.id
      }
    }

    // If no subcategory matched well, consider just the category
    if (categoryScore > bestScore && categoryScore > 40) {
      bestScore = categoryScore
      bestCategoryId = category.id
      bestSubcategoryId = null
    }
  }

  return {
    categoryId: bestCategoryId,
    subcategoryId: bestSubcategoryId,
    confidence: bestScore
  }
}

async function main() {
  console.log('Starting auto-categorization...')

  // Fetch all custom categories with subcategories
  const categories = await prisma.customCategory.findMany({
    include: {
      subcategories: true
    }
  })
  console.log(`Loaded ${categories.length} categories`)

  // Fetch all transactions
  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      name: true,
      merchantName: true,
      category: true,
      subcategory: true,
      notes: true,
      customCategoryId: true,
      customSubcategoryId: true
    }
  })
  console.log(`Processing ${transactions.length} transactions...`)

  let categorized = 0
  let skipped = 0

  for (const transaction of transactions) {
    // Build transaction data array (prioritize notes)
    const transactionData: string[] = []

    if (transaction.notes) transactionData.push(transaction.notes) // Highest priority
    if (transaction.name) transactionData.push(transaction.name)
    if (transaction.merchantName) transactionData.push(transaction.merchantName)
    if (transaction.category) transactionData.push(transaction.category)
    if (transaction.subcategory) transactionData.push(transaction.subcategory)

    // Find best match
    const match = findBestMatch(transactionData, categories)

    // Only update if confidence > 50%
    if (match.confidence > 50 && match.categoryId) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          customCategory: { connect: { id: match.categoryId } },
          customSubcategory: match.subcategoryId
            ? { connect: { id: match.subcategoryId } }
            : { disconnect: true }
        }
      })

      const category = categories.find(c => c.id === match.categoryId)
      const subcategory = category?.subcategories.find(s => s.id === match.subcategoryId)

      console.log(
        `✓ [${match.confidence.toFixed(0)}%] "${transaction.name}" → ${category?.name}` +
        (subcategory ? ` > ${subcategory.name}` : '')
      )
      categorized++
    } else {
      skipped++
      if (match.confidence > 0) {
        console.log(`✗ [${match.confidence.toFixed(0)}%] "${transaction.name}" - Low confidence, skipped`)
      }
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Total transactions: ${transactions.length}`)
  console.log(`Categorized: ${categorized}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Success rate: ${((categorized / transactions.length) * 100).toFixed(1)}%`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
