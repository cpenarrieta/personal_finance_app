import { internalMutation, mutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { v } from "convex/values"
import { components } from "./_generated/api"

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

// Migration mutations for auth data from PostgreSQL to Convex Better Auth
// These use the Better Auth component's adapter directly

export const migrateUser = mutation({
  args: {
    id: v.string(),
    email: v.string(),
    name: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Use the Better Auth component adapter to create user
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: args.email,
          name: args.name,
          emailVerified: args.emailVerified,
          image: args.image ?? null,
          createdAt: args.createdAt,
          updatedAt: args.updatedAt,
        },
      },
    })
    return { success: true }
  },
})

export const migrateAccount = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    providerId: v.string(),
    accountId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    idToken: v.optional(v.string()),
    password: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          userId: args.userId, // Use the original ID; Better Auth handles mapping
          providerId: args.providerId,
          accountId: args.accountId,
          accessToken: args.accessToken ?? null,
          refreshToken: args.refreshToken ?? null,
          accessTokenExpiresAt: args.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: args.refreshTokenExpiresAt ?? null,
          scope: args.scope ?? null,
          idToken: args.idToken ?? null,
          password: args.password ?? null,
          createdAt: args.createdAt,
          updatedAt: args.updatedAt,
        },
      },
    })
    return { success: true }
  },
})

export const migrateSession = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: args.userId,
          token: args.token,
          expiresAt: args.expiresAt,
          ipAddress: args.ipAddress ?? null,
          userAgent: args.userAgent ?? null,
          createdAt: args.createdAt,
          updatedAt: args.updatedAt,
        },
      },
    })
    return { success: true }
  },
})
