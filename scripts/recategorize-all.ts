import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface CategoryMatch {
  categoryName: string | null
  subcategoryName: string | null
  confidence: number
  reasoning: string
}

async function categorizeBatch(
  transactions: Array<{
    id: string
    name: string
    merchantName: string | null
    category: string | null
    subcategory: string | null
    notes: string | null
    amount: string
  }>,
  categories: Array<{
    id: string
    name: string
    subcategories: Array<{ id: string; name: string }>
  }>
): Promise<Map<string, CategoryMatch>> {
  const categoriesStr = categories.map(cat => {
    const subs = cat.subcategories.map(s => s.name).join(', ')
    return `${cat.name}: [${subs}]`
  }).join('\n')

  const transactionsStr = transactions.map((t, idx) => {
    const amount = Number(t.amount)
    const type = amount > 0 ? 'expense' : 'income'
    return `[${idx}] "${t.name}" | Merchant: ${t.merchantName || 'N/A'} | Amount: $${Math.abs(amount).toFixed(2)} (${type}) | Plaid: ${t.category || 'N/A'}/${t.subcategory || 'N/A'} | Notes: ${t.notes || 'N/A'}`
  }).join('\n')

  const prompt = `You are a financial transaction categorizer. Given the following custom categories and transactions, categorize each transaction.

CATEGORIES:
${categoriesStr}

TRANSACTIONS:
${transactionsStr}

For each transaction, respond with a JSON array where each object has:
- transactionIndex: number (0-based index from the list above)
- categoryName: string (exact category name including emoji) or null
- subcategoryName: string (exact subcategory name) or null
- confidence: number (0-100, only assign if >50)
- reasoning: string (brief explanation)

IMPORTANT RULES:
1. Prioritize "Notes" field if available - it often has user context
2. Only assign a category if confidence > 50
3. If you can't match a subcategory but the category is clear, just use the category
4. Use exact names from the category list (including emojis)
5. Consider transaction type (income vs expense) when categorizing
6. Be conservative - when in doubt, return null

Return ONLY the JSON array, no other text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial transaction categorization assistant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from OpenAI')

    const parsed = JSON.parse(content)
    const results = parsed.results || parsed.transactions || parsed

    if (!Array.isArray(results)) {
      throw new Error('Response is not an array')
    }

    const matchMap = new Map<string, CategoryMatch>()
    results.forEach((result: any) => {
      const txId = transactions[result.transactionIndex]?.id
      if (txId) {
        matchMap.set(txId, {
          categoryName: result.categoryName,
          subcategoryName: result.subcategoryName,
          confidence: result.confidence || 0,
          reasoning: result.reasoning || ''
        })
      }
    })

    return matchMap
  } catch (error) {
    console.error('Error calling OpenAI:', error)
    return new Map()
  }
}

async function main() {
  console.log('⚠️  WARNING: This will re-categorize ALL transactions using AI, overwriting any existing custom categories.\n')

  // Fetch all custom categories with subcategories
  const categories = await prisma.category.findMany({
    include: {
      subcategories: true
    }
  })
  console.log(`Loaded ${categories.length} categories`)

  // Fetch ALL transactions (no filter for existing categories - this will overwrite)
  const transactions = await prisma.transaction.findMany({
    select: {
      id: true,
      name: true,
      merchantName: true,
      category: true,
      subcategory: true,
      notes: true,
      amount: true
    }
  })

  if (transactions.length === 0) {
    console.log('No transactions to categorize')
    return
  }

  console.log(`Processing ${transactions.length} transactions (will overwrite existing)...\n`)

  let categorized = 0
  let skipped = 0

  // Process in batches of 20
  const BATCH_SIZE = 20
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, Math.min(i + BATCH_SIZE, transactions.length))

    console.log(`\n--- Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (transactions ${i + 1}-${Math.min(i + BATCH_SIZE, transactions.length)}) ---`)

    const batchData = batch.map(t => ({
      id: t.id,
      name: t.name,
      merchantName: t.merchantName,
      category: t.category,
      subcategory: t.subcategory,
      notes: t.notes,
      amount: t.amount.toString()
    }))

    const matches = await categorizeBatch(batchData, categories)

    for (const transaction of batch) {
      const match = matches.get(transaction.id)

      if (!match || match.confidence <= 50 || !match.categoryName) {
        console.log(`✗ [${match?.confidence || 0}%] "${transaction.name}" - ${match?.reasoning || 'Low confidence, skipped'}`)
        skipped++
        continue
      }

      const category = categories.find(c => c.name === match.categoryName)
      if (!category) {
        console.log(`✗ Category not found: ${match.categoryName}`)
        skipped++
        continue
      }

      const subcategory = match.subcategoryName
        ? category.subcategories.find(s => s.name === match.subcategoryName)
        : null

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          category: { connect: { id: category.id } },
          subcategory: subcategory
            ? { connect: { id: subcategory.id } }
            : { disconnect: true }
        }
      })

      console.log(
        `✓ [${match.confidence}%] "${transaction.name}" → ${category.name}` +
        (subcategory ? ` > ${subcategory.name}` : '') +
        ` | ${match.reasoning}`
      )
      categorized++
    }

    // Small delay between batches
    if (i + BATCH_SIZE < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Total transactions: ${transactions.length}`)
  console.log(`Re-categorized: ${categorized} (overwrote existing)`)
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

