import { internalMutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// Seed data extracted from dev deployment
// Categories and subcategories for preview deployments

const seedCategories = [
  { name: "🍔 Food", groupType: "EXPENSES" as const, displayOrder: 0 },
  { name: "🛒 Groceries", groupType: "EXPENSES" as const, displayOrder: 1 },
  { name: "🏡 Core Housing", groupType: "EXPENSES" as const, displayOrder: 2 },
  { name: "🛠️ Home Upkeep", groupType: "EXPENSES" as const, displayOrder: 3 },
  { name: "🎭 Entertainment & Fun", groupType: "EXPENSES" as const, displayOrder: 4 },
  { name: "✈️ Vacations", groupType: "EXPENSES" as const, displayOrder: 5 },
  { name: "✨ Personal & Giving", groupType: "EXPENSES" as const, displayOrder: 6 },
  { name: "⚕️ Health & Wellness", groupType: "EXPENSES" as const, displayOrder: 7 },
  { name: "💡 Utilities", groupType: "EXPENSES" as const, displayOrder: 8 },
  { name: "🚗 Transportation", groupType: "EXPENSES" as const, displayOrder: 9 },
  { name: "👨‍👩‍👧 Family", groupType: "EXPENSES" as const, displayOrder: 10 },
  { name: "👨‍💻 316-Software", groupType: "EXPENSES" as const, displayOrder: 11 },
  { name: "💳 Debt Repayment", groupType: "EXPENSES" as const, displayOrder: 12 },
  { name: "💵 Income", groupType: "INCOME" as const, displayOrder: 0 },
  { name: "🔁 Transfers", groupType: "TRANSFER" as const, displayOrder: 1 },
  { name: "🏦 Savings", groupType: "INVESTMENT" as const, displayOrder: 0 },
]

// Subcategories mapped by category name
const seedSubcategories: Record<string, string[]> = {
  "🍔 Food": ["Takeout & Delivery", "Coffee Shops", "Restaurants", "Hot lunch", "Liquor", "Other"],
  "🛒 Groceries": ["Costco", "Wallmart", "Save-on-Foods", "No-frills", "Meridian", "Other"],
  "🏡 Core Housing": ["Mortgage", "Home Insurance", "Property Taxes", "Other"],
  "🛠️ Home Upkeep": ["Repairs", "Maintenance", "Cleaning", "Lawn Care", "Other"],
  "🎭 Entertainment & Fun": ["Family Activities", "Subscriptions", "Concerts", "Movies", "Other"],
  "✈️ Vacations": ["hotel", "tickets", "airplanes/ferry/etc", "Other"],
  "✨ Personal & Giving": [
    "Giving (Charity, Church)",
    "Shopping",
    "Bank Fees",
    "Gifts",
    "Taxes (CRA, etc)",
    "Toys",
    "Education",
    "Miscellaneous",
    "Other",
  ],
  "⚕️ Health & Wellness": ["Fitness", "Personal Care (Haircuts)", "Medical Expenses", "Other"],
  "💡 Utilities": ["Electricity", "Gas", "Phone", "Internet", "Other"],
  "🚗 Transportation": [
    "Car Payment",
    "Car Insurance",
    "Maintenance",
    "Public Transit",
    "Gasoline/Supercharger",
    "Parking",
    "Taxi",
    "Other",
  ],
  "👨‍👩‍👧 Family": ["Kids' Activities", "School Supplies", "School Tuition", "Childcare", "Uniforms", "Other"],
  "👨‍💻 316-Software": ["infrastructure", "ai", "domains", "Other"],
  "💳 Debt Repayment": ["Credit Card Payments", "Student Loan", "Other Loans", "Other"],
  "💵 Income": ["Gusto", "NEU", "Bonuses", "Freelance Work", "Side Hustle", "Gifts Received", "Other"],
  "🔁 Transfers": ["Moving money between your own accounts (e.g., Checking to Savings)"],
  "🏦 Savings": ["Retirement (RRSP, TFSA)", "General Savings", "Investments", "Emergency Fund", "Other"],
}

const seedTags = [
  { name: "unknown", color: "#64748b" },
  { name: "split candidate", color: "#F97316" },
  { name: "for-review", color: "#fbbf24" },
  { name: "sign-review", color: "#f97316" },
]

const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingCategory = await ctx.db.query("categories").first()
    if (existingCategory) {
      console.log("Database already seeded, skipping...")
      return { seeded: false, message: "Already seeded" }
    }

    console.log("Seeding database...")
    const now = Date.now()

    // Insert categories and build name -> id map
    const categoryIdMap = new Map<string, string>()

    for (const cat of seedCategories) {
      const id = await ctx.db.insert("categories", {
        name: cat.name,
        groupType: cat.groupType,
        displayOrder: cat.displayOrder,
        createdAt: now,
        updatedAt: now,
      })
      categoryIdMap.set(cat.name, id)
    }
    console.log(`Inserted ${seedCategories.length} categories`)

    // Insert subcategories using category name -> id mapping
    let subcategoryCount = 0
    for (const [categoryName, subcategories] of Object.entries(seedSubcategories)) {
      const categoryId = categoryIdMap.get(categoryName)
      if (!categoryId) {
        console.warn(`Category not found: ${categoryName}`)
        continue
      }

      for (const subName of subcategories) {
        await ctx.db.insert("subcategories", {
          categoryId: categoryId as Id<"categories">,
          name: subName,
          createdAt: now,
          updatedAt: now,
        })
        subcategoryCount++
      }
    }
    console.log(`Inserted ${subcategoryCount} subcategories`)

    // Insert tags
    for (const tag of seedTags) {
      await ctx.db.insert("tags", {
        name: tag.name,
        color: tag.color,
        createdAt: now,
        updatedAt: now,
      })
    }
    console.log(`Inserted ${seedTags.length} tags`)

    return {
      seeded: true,
      message: `Seeded ${seedCategories.length} categories, ${subcategoryCount} subcategories, ${seedTags.length} tags`,
    }
  },
})

export default init
