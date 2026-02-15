import { internalMutation, mutation } from "./_generated/server"
import { Id } from "./_generated/dataModel"

// ============================================================================
// DEMO SEED DATA — Realistic Canadian personal finance data
// ============================================================================

// Reuse categories/subcategories/tags from init.ts
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

// Deterministic pseudo-random number generator (seeded)
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function randomBetween(rand: () => number, min: number, max: number) {
  return Math.round((min + rand() * (max - min)) * 100) / 100
}

function pickRandom<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

// ============================================================================
// Recurring monthly transactions template
// ============================================================================
interface RecurringTemplate {
  name: string
  merchantName: string
  amount: number // positive = expense (will be negated)
  categoryName: string
  subcategoryName?: string
  accountType: "chequing" | "credit"
  dayOfMonth: number
  variance?: number // +/- variance in amount
}

const recurringMonthly: RecurringTemplate[] = [
  { name: "Mortgage Payment", merchantName: "TD Mortgage", amount: 2100, categoryName: "🏡 Core Housing", subcategoryName: "Mortgage", accountType: "chequing", dayOfMonth: 1 },
  { name: "Home Insurance", merchantName: "Intact Insurance", amount: 185, categoryName: "🏡 Core Housing", subcategoryName: "Home Insurance", accountType: "chequing", dayOfMonth: 15 },
  { name: "BC Hydro", merchantName: "BC Hydro", amount: 195, categoryName: "💡 Utilities", subcategoryName: "Electricity", accountType: "chequing", dayOfMonth: 20, variance: 55 },
  { name: "FortisBC", merchantName: "FortisBC", amount: 85, categoryName: "💡 Utilities", subcategoryName: "Gas", accountType: "chequing", dayOfMonth: 22, variance: 40 },
  { name: "Telus Mobility", merchantName: "Telus", amount: 85, categoryName: "💡 Utilities", subcategoryName: "Phone", accountType: "credit", dayOfMonth: 8 },
  { name: "Shaw Internet", merchantName: "Shaw Communications", amount: 75, categoryName: "💡 Utilities", subcategoryName: "Internet", accountType: "chequing", dayOfMonth: 10 },
  { name: "ICBC Auto Insurance", merchantName: "ICBC", amount: 150, categoryName: "🚗 Transportation", subcategoryName: "Car Insurance", accountType: "chequing", dayOfMonth: 5 },
  { name: "Netflix", merchantName: "Netflix", amount: 16.99, categoryName: "🎭 Entertainment & Fun", subcategoryName: "Subscriptions", accountType: "credit", dayOfMonth: 12 },
  { name: "Spotify Premium", merchantName: "Spotify", amount: 10.99, categoryName: "🎭 Entertainment & Fun", subcategoryName: "Subscriptions", accountType: "credit", dayOfMonth: 14 },
  { name: "Disney+", merchantName: "Disney Plus", amount: 11.99, categoryName: "🎭 Entertainment & Fun", subcategoryName: "Subscriptions", accountType: "credit", dayOfMonth: 18 },
  { name: "GoodLife Fitness", merchantName: "GoodLife Fitness", amount: 55, categoryName: "⚕️ Health & Wellness", subcategoryName: "Fitness", accountType: "credit", dayOfMonth: 1 },
]

// Variable transactions template (repeated multiple times per month with variance)
interface VariableTemplate {
  merchants: { name: string; merchantName: string; minAmount: number; maxAmount: number }[]
  categoryName: string
  subcategoryName?: string
  accountType: "chequing" | "credit"
  minPerMonth: number
  maxPerMonth: number
}

const variableTransactions: VariableTemplate[] = [
  {
    merchants: [
      { name: "Costco Wholesale", merchantName: "Costco", minAmount: 120, maxAmount: 350 },
      { name: "Save-On-Foods", merchantName: "Save-On-Foods", minAmount: 45, maxAmount: 150 },
      { name: "No Frills", merchantName: "No Frills", minAmount: 30, maxAmount: 95 },
      { name: "Superstore", merchantName: "Real Canadian Superstore", minAmount: 55, maxAmount: 180 },
    ],
    categoryName: "🛒 Groceries",
    accountType: "credit",
    minPerMonth: 8,
    maxPerMonth: 12,
  },
  {
    merchants: [
      { name: "Tim Hortons", merchantName: "Tim Hortons", minAmount: 3.5, maxAmount: 12 },
      { name: "Starbucks", merchantName: "Starbucks", minAmount: 5, maxAmount: 15 },
      { name: "McDonald's", merchantName: "McDonald's", minAmount: 8, maxAmount: 22 },
      { name: "DoorDash", merchantName: "DoorDash", minAmount: 25, maxAmount: 55 },
      { name: "Boston Pizza", merchantName: "Boston Pizza", minAmount: 35, maxAmount: 85 },
      { name: "White Spot", merchantName: "White Spot", minAmount: 30, maxAmount: 70 },
    ],
    categoryName: "🍔 Food",
    accountType: "credit",
    minPerMonth: 4,
    maxPerMonth: 8,
  },
  {
    merchants: [
      { name: "Petro-Canada", merchantName: "Petro-Canada", minAmount: 50, maxAmount: 95 },
      { name: "Shell", merchantName: "Shell", minAmount: 45, maxAmount: 90 },
      { name: "Esso", merchantName: "Esso", minAmount: 40, maxAmount: 85 },
    ],
    categoryName: "🚗 Transportation",
    subcategoryName: "Gasoline/Supercharger",
    accountType: "credit",
    minPerMonth: 3,
    maxPerMonth: 5,
  },
  {
    merchants: [
      { name: "Amazon.ca", merchantName: "Amazon", minAmount: 15, maxAmount: 180 },
      { name: "Walmart", merchantName: "Walmart", minAmount: 20, maxAmount: 120 },
      { name: "Canadian Tire", merchantName: "Canadian Tire", minAmount: 15, maxAmount: 95 },
    ],
    categoryName: "✨ Personal & Giving",
    subcategoryName: "Shopping",
    accountType: "credit",
    minPerMonth: 2,
    maxPerMonth: 5,
  },
]

// ============================================================================
// SECURITIES DATA
// ============================================================================
const demoSecurities = [
  { plaidSecurityId: "demo_sec_xeqt", name: "iShares Core Equity ETF Portfolio", tickerSymbol: "XEQT", type: "etf", isoCurrencyCode: "CAD" },
  { plaidSecurityId: "demo_sec_vfv", name: "Vanguard S&P 500 Index ETF", tickerSymbol: "VFV", type: "etf", isoCurrencyCode: "CAD" },
  { plaidSecurityId: "demo_sec_aapl", name: "Apple Inc.", tickerSymbol: "AAPL", type: "equity", isoCurrencyCode: "USD" },
  { plaidSecurityId: "demo_sec_msft", name: "Microsoft Corporation", tickerSymbol: "MSFT", type: "equity", isoCurrencyCode: "USD" },
  { plaidSecurityId: "demo_sec_shop", name: "Shopify Inc.", tickerSymbol: "SHOP", type: "equity", isoCurrencyCode: "CAD" },
  { plaidSecurityId: "demo_sec_td", name: "Toronto-Dominion Bank", tickerSymbol: "TD", type: "equity", isoCurrencyCode: "CAD" },
  { plaidSecurityId: "demo_sec_ry", name: "Royal Bank of Canada", tickerSymbol: "RY", type: "equity", isoCurrencyCode: "CAD" },
  { plaidSecurityId: "demo_sec_mmf", name: "CI High Interest Savings Fund", tickerSymbol: "CSAV", type: "mutual fund", isoCurrencyCode: "CAD" },
]

// ============================================================================
// MAIN SEED MUTATION
// ============================================================================

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingCategory = await ctx.db.query("categories").first()
    if (existingCategory) {
      console.log("Demo database already seeded, skipping...")
      return { seeded: false, message: "Already seeded" }
    }

    console.log("Seeding demo database with Canadian data...")
    const now = Date.now()
    const rand = seededRandom(42)

    // ========================================================================
    // 1. Categories & Subcategories
    // ========================================================================
    const categoryIdMap = new Map<string, Id<"categories">>()
    const subcategoryIdMap = new Map<string, Id<"subcategories">>()

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

    for (const [categoryName, subs] of Object.entries(seedSubcategories)) {
      const categoryId = categoryIdMap.get(categoryName)
      if (!categoryId) continue
      for (const subName of subs) {
        const id = await ctx.db.insert("subcategories", {
          categoryId,
          name: subName,
          createdAt: now,
          updatedAt: now,
        })
        subcategoryIdMap.set(`${categoryName}::${subName}`, id)
      }
    }
    console.log(`Seeded ${seedCategories.length} categories`)

    // ========================================================================
    // 2. Tags
    // ========================================================================
    const tagIdMap = new Map<string, Id<"tags">>()
    for (const tag of seedTags) {
      const id = await ctx.db.insert("tags", {
        name: tag.name,
        color: tag.color,
        createdAt: now,
        updatedAt: now,
      })
      tagIdMap.set(tag.name, id)
    }

    // ========================================================================
    // 3. Institutions
    // ========================================================================
    const rbcId = await ctx.db.insert("institutions", {
      plaidInstitutionId: "ins_demo_rbc",
      name: "Royal Bank of Canada",
      shortName: "RBC",
      createdAt: now,
    })
    const tdId = await ctx.db.insert("institutions", {
      plaidInstitutionId: "ins_demo_td",
      name: "TD Canada Trust",
      shortName: "TD",
      createdAt: now,
    })
    const wsId = await ctx.db.insert("institutions", {
      plaidInstitutionId: "ins_demo_ws",
      name: "Wealthsimple",
      shortName: "WS",
      createdAt: now,
    })
    const qtId = await ctx.db.insert("institutions", {
      plaidInstitutionId: "ins_demo_qt",
      name: "Questrade",
      shortName: "QT",
      createdAt: now,
    })

    // ========================================================================
    // 4. Items (Plaid connections — fake tokens)
    // ========================================================================
    const rbcItemId = await ctx.db.insert("items", {
      plaidItemId: "demo_item_rbc",
      accessToken: "demo_access_token_rbc",
      institutionId: rbcId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })
    const tdItemId = await ctx.db.insert("items", {
      plaidItemId: "demo_item_td",
      accessToken: "demo_access_token_td",
      institutionId: tdId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })
    const wsItemId = await ctx.db.insert("items", {
      plaidItemId: "demo_item_ws",
      accessToken: "demo_access_token_ws",
      institutionId: wsId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })
    const qtItemId = await ctx.db.insert("items", {
      plaidItemId: "demo_item_qt",
      accessToken: "demo_access_token_qt",
      institutionId: qtId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })

    // ========================================================================
    // 5. Accounts
    // ========================================================================
    const chequingId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_rbc_chq",
      itemId: rbcItemId,
      name: "RBC Chequing",
      officialName: "RBC Day to Day Banking",
      mask: "4521",
      type: "depository",
      subtype: "checking",
      currency: "CAD",
      currentBalance: 4247.83,
      availableBalance: 4247.83,
      createdAt: now,
      updatedAt: now,
    })
    const savingsId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_rbc_sav",
      itemId: rbcItemId,
      name: "RBC Savings",
      officialName: "RBC High Interest eSavings",
      mask: "7823",
      type: "depository",
      subtype: "savings",
      currency: "CAD",
      currentBalance: 15534.20,
      availableBalance: 15534.20,
      createdAt: now,
      updatedAt: now,
    })
    const creditId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_td_visa",
      itemId: tdItemId,
      name: "TD Visa Infinite",
      officialName: "TD Aeroplan Visa Infinite",
      mask: "9012",
      type: "credit",
      subtype: "credit card",
      currency: "CAD",
      currentBalance: -1847.32,
      creditLimit: 15000,
      createdAt: now,
      updatedAt: now,
    })
    const wsTfsaId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_ws_tfsa",
      itemId: wsItemId,
      name: "Wealthsimple TFSA",
      officialName: "Tax-Free Savings Account",
      mask: "3456",
      type: "investment",
      subtype: "tfsa",
      currency: "CAD",
      currentBalance: 45230.15,
      createdAt: now,
      updatedAt: now,
    })
    const wsPersonalId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_ws_personal",
      itemId: wsItemId,
      name: "Wealthsimple Personal",
      officialName: "Non-Registered Account",
      mask: "6789",
      type: "investment",
      subtype: "brokerage",
      currency: "CAD",
      currentBalance: 12145.67,
      createdAt: now,
      updatedAt: now,
    })
    const qtRrspId = await ctx.db.insert("accounts", {
      plaidAccountId: "demo_acct_qt_rrsp",
      itemId: qtItemId,
      name: "Questrade RRSP",
      officialName: "Registered Retirement Savings Plan",
      mask: "2345",
      type: "investment",
      subtype: "rrsp",
      currency: "CAD",
      currentBalance: 78420.50,
      createdAt: now,
      updatedAt: now,
    })

    // ========================================================================
    // 6. Transactions (~700 over 12 months)
    // ========================================================================
    const today = new Date()
    const transactionIds: Id<"transactions">[] = []
    let txCounter = 0

    // Helper to create a transaction
    async function createTx(opts: {
      date: Date
      name: string
      merchantName: string
      amount: number // negative for expenses
      accountId: Id<"accounts">
      categoryId?: Id<"categories">
      subcategoryId?: Id<"subcategories">
      pending?: boolean
      isSplit?: boolean
      parentTransactionId?: Id<"transactions">
    }) {
      txCounter++
      const dateMs = opts.date.getTime()
      const datetime = opts.date.toISOString()
      const id = await ctx.db.insert("transactions", {
        plaidTransactionId: `demo_tx_${txCounter}`,
        accountId: opts.accountId,
        amount: opts.amount,
        isoCurrencyCode: "CAD",
        date: dateMs,
        datetime,
        pending: opts.pending ?? false,
        merchantName: opts.merchantName,
        name: opts.name,
        categoryId: opts.categoryId,
        subcategoryId: opts.subcategoryId,
        files: [],
        isSplit: opts.isSplit ?? false,
        isManual: false,
        parentTransactionId: opts.parentTransactionId,
        createdAt: dateMs,
        updatedAt: dateMs,
      })
      transactionIds.push(id)
      return id
    }

    // Generate 12 months of data
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const year = today.getFullYear()
      const month = today.getMonth() - monthsAgo
      const monthDate = new Date(year, month, 1)

      // Bi-weekly salary (1st and 15th)
      const incomeCategory = categoryIdMap.get("💵 Income")
      const incomeSubcategory = subcategoryIdMap.get("💵 Income::Gusto")
      await createTx({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        name: "PAYROLL DEPOSIT",
        merchantName: "Gusto",
        amount: 3800,
        accountId: chequingId,
        categoryId: incomeCategory,
        subcategoryId: incomeSubcategory,
      })
      await createTx({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        name: "PAYROLL DEPOSIT",
        merchantName: "Gusto",
        amount: 3800,
        accountId: chequingId,
        categoryId: incomeCategory,
        subcategoryId: incomeSubcategory,
      })

      // Recurring monthly expenses
      for (const recurring of recurringMonthly) {
        const amount = recurring.variance
          ? randomBetween(rand, recurring.amount - recurring.variance, recurring.amount + recurring.variance)
          : recurring.amount
        const accountId = recurring.accountType === "chequing" ? chequingId : creditId
        const categoryId = categoryIdMap.get(recurring.categoryName)
        const subcategoryId = recurring.subcategoryName
          ? subcategoryIdMap.get(`${recurring.categoryName}::${recurring.subcategoryName}`)
          : undefined

        await createTx({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), recurring.dayOfMonth),
          name: recurring.name,
          merchantName: recurring.merchantName,
          amount: -amount,
          accountId,
          categoryId,
          subcategoryId,
        })
      }

      // Variable transactions
      for (const variable of variableTransactions) {
        const count = Math.floor(randomBetween(rand, variable.minPerMonth, variable.maxPerMonth))
        for (let i = 0; i < count; i++) {
          const merchant = pickRandom(rand, variable.merchants)
          const amount = randomBetween(rand, merchant.minAmount, merchant.maxAmount)
          const day = Math.floor(randomBetween(rand, 1, 28))
          const accountId = variable.accountType === "chequing" ? chequingId : creditId
          const categoryId = categoryIdMap.get(variable.categoryName)

          // Find matching subcategory for grocery stores
          let subcategoryId: Id<"subcategories"> | undefined
          if (variable.subcategoryName) {
            subcategoryId = subcategoryIdMap.get(`${variable.categoryName}::${variable.subcategoryName}`)
          } else if (variable.categoryName === "🛒 Groceries") {
            const subName = merchant.merchantName === "Costco" ? "Costco"
              : merchant.merchantName === "Save-On-Foods" ? "Save-on-Foods"
              : merchant.merchantName === "No Frills" ? "No-frills"
              : "Other"
            subcategoryId = subcategoryIdMap.get(`🛒 Groceries::${subName}`)
          } else if (variable.categoryName === "🍔 Food") {
            const subName = merchant.merchantName === "Tim Hortons" || merchant.merchantName === "Starbucks"
              ? "Coffee Shops"
              : merchant.merchantName === "DoorDash"
              ? "Takeout & Delivery"
              : "Restaurants"
            subcategoryId = subcategoryIdMap.get(`🍔 Food::${subName}`)
          }

          // Leave ~15% uncategorized for current/recent months (for review page)
          const shouldCategorize = monthsAgo > 1 || rand() > 0.15

          await createTx({
            date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
            name: merchant.name,
            merchantName: merchant.merchantName,
            amount: -amount,
            accountId,
            categoryId: shouldCategorize ? categoryId : undefined,
            subcategoryId: shouldCategorize ? subcategoryId : undefined,
          })
        }
      }

      // Monthly transfer to savings
      const transferCategory = categoryIdMap.get("🔁 Transfers")
      if (monthsAgo > 0) {
        await createTx({
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 2),
          name: "Transfer to Savings",
          merchantName: "RBC Transfer",
          amount: -500,
          accountId: chequingId,
          categoryId: transferCategory,
        })
      }
    }

    // Create 2 split transactions (demonstrating the split feature)
    const splitCategoryId = categoryIdMap.get("🛒 Groceries")
    const parentTx = await createTx({
      date: new Date(today.getFullYear(), today.getMonth() - 1, 8),
      name: "Costco Wholesale #1234",
      merchantName: "Costco",
      amount: -287.45,
      accountId: creditId,
      categoryId: splitCategoryId,
      isSplit: true,
    })
    await createTx({
      date: new Date(today.getFullYear(), today.getMonth() - 1, 8),
      name: "Costco - Groceries",
      merchantName: "Costco",
      amount: -198.30,
      accountId: creditId,
      categoryId: splitCategoryId,
      subcategoryId: subcategoryIdMap.get("🛒 Groceries::Costco"),
      parentTransactionId: parentTx,
    })
    await createTx({
      date: new Date(today.getFullYear(), today.getMonth() - 1, 8),
      name: "Costco - Household",
      merchantName: "Costco",
      amount: -89.15,
      accountId: creditId,
      categoryId: categoryIdMap.get("✨ Personal & Giving"),
      subcategoryId: subcategoryIdMap.get("✨ Personal & Giving::Shopping"),
      parentTransactionId: parentTx,
    })

    console.log(`Seeded ${txCounter} transactions`)

    // Tag some transactions for review
    const forReviewTagId = tagIdMap.get("for-review")
    const splitCandidateTagId = tagIdMap.get("split candidate")
    if (forReviewTagId) {
      // Tag last 5 transactions with "for-review"
      for (let i = 0; i < Math.min(5, transactionIds.length); i++) {
        const txId = transactionIds[transactionIds.length - 1 - i]
        await ctx.db.insert("transactionTags", {
          transactionId: txId,
          tagId: forReviewTagId,
          createdAt: now,
        })
      }
    }
    if (splitCandidateTagId && transactionIds.length > 10) {
      // Tag 3 transactions with "split candidate"
      for (let i = 5; i < 8; i++) {
        const txId = transactionIds[transactionIds.length - 1 - i]
        await ctx.db.insert("transactionTags", {
          transactionId: txId,
          tagId: splitCandidateTagId,
          createdAt: now,
        })
      }
    }

    // ========================================================================
    // 7. Securities & Holdings
    // ========================================================================
    const securityIdMap = new Map<string, Id<"securities">>()
    for (const sec of demoSecurities) {
      const id = await ctx.db.insert("securities", {
        plaidSecurityId: sec.plaidSecurityId,
        name: sec.name,
        tickerSymbol: sec.tickerSymbol,
        type: sec.type,
        isoCurrencyCode: sec.isoCurrencyCode,
        createdAt: now,
        updatedAt: now,
      })
      securityIdMap.set(sec.tickerSymbol!, id)
    }

    // Holdings distributed across investment accounts
    const holdingsData = [
      { accountId: wsTfsaId, ticker: "XEQT", qty: 450, costBasis: 28.50, price: 32.15 },
      { accountId: wsTfsaId, ticker: "VFV", qty: 120, costBasis: 85.20, price: 98.45 },
      { accountId: wsTfsaId, ticker: "TD", qty: 50, costBasis: 78.30, price: 82.10 },
      { accountId: wsPersonalId, ticker: "AAPL", qty: 25, costBasis: 165.00, price: 192.30 },
      { accountId: wsPersonalId, ticker: "SHOP", qty: 15, costBasis: 72.50, price: 95.80 },
      { accountId: qtRrspId, ticker: "XEQT", qty: 800, costBasis: 26.80, price: 32.15 },
      { accountId: qtRrspId, ticker: "MSFT", qty: 30, costBasis: 340.00, price: 415.50 },
      { accountId: qtRrspId, ticker: "RY", qty: 100, costBasis: 128.40, price: 142.75 },
    ]

    for (const h of holdingsData) {
      const secId = securityIdMap.get(h.ticker)
      if (!secId) continue
      await ctx.db.insert("holdings", {
        accountId: h.accountId,
        securityId: secId,
        quantity: h.qty,
        costBasis: h.costBasis * h.qty,
        institutionPrice: h.price,
        institutionPriceAsOf: now,
        isoCurrencyCode: "CAD",
        createdAt: now,
        updatedAt: now,
      })
    }

    // ========================================================================
    // 8. Investment Transactions (~40 over 12 months)
    // ========================================================================
    let invTxCounter = 0
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 15)

      // Monthly XEQT buy in TFSA
      invTxCounter++
      const xeqtSecId = securityIdMap.get("XEQT")
      if (xeqtSecId) {
        await ctx.db.insert("investmentTransactions", {
          plaidInvestmentTransactionId: `demo_inv_tx_${invTxCounter}`,
          accountId: wsTfsaId,
          securityId: xeqtSecId,
          type: "buy",
          amount: 500,
          price: randomBetween(rand, 28, 33),
          quantity: randomBetween(rand, 15, 18),
          isoCurrencyCode: "CAD",
          date: monthDate.getTime(),
          transactionDatetime: monthDate.toISOString(),
          name: "Buy XEQT",
          createdAt: monthDate.getTime(),
          updatedAt: monthDate.getTime(),
        })
      }

      // Monthly XEQT buy in RRSP
      invTxCounter++
      if (xeqtSecId) {
        await ctx.db.insert("investmentTransactions", {
          plaidInvestmentTransactionId: `demo_inv_tx_${invTxCounter}`,
          accountId: qtRrspId,
          securityId: xeqtSecId,
          type: "buy",
          amount: 800,
          price: randomBetween(rand, 28, 33),
          quantity: randomBetween(rand, 24, 29),
          isoCurrencyCode: "CAD",
          date: monthDate.getTime(),
          transactionDatetime: monthDate.toISOString(),
          name: "Buy XEQT",
          createdAt: monthDate.getTime(),
          updatedAt: monthDate.getTime(),
        })
      }

      // Quarterly dividend
      if (monthsAgo % 3 === 0) {
        const tdSecId = securityIdMap.get("TD")
        if (tdSecId) {
          invTxCounter++
          await ctx.db.insert("investmentTransactions", {
            plaidInvestmentTransactionId: `demo_inv_tx_${invTxCounter}`,
            accountId: wsTfsaId,
            securityId: tdSecId,
            type: "dividend",
            amount: randomBetween(rand, 45, 55),
            isoCurrencyCode: "CAD",
            date: monthDate.getTime(),
            transactionDatetime: monthDate.toISOString(),
            name: "TD Dividend",
            createdAt: monthDate.getTime(),
            updatedAt: monthDate.getTime(),
          })
        }
      }
    }
    console.log(`Seeded ${invTxCounter} investment transactions`)

    // ========================================================================
    // 9. Registered Accounts (RRSP/TFSA/RESP)
    // ========================================================================
    const beneficiaryId = await ctx.db.insert("respBeneficiaries", {
      name: "Emma",
      dateOfBirth: "2020-06-15",
      notes: "RESP beneficiary",
      createdAt: now,
      updatedAt: now,
    })

    const myRrspId = await ctx.db.insert("registeredAccounts", {
      name: "My RRSP",
      accountType: "RRSP",
      owner: "self",
      contributor: "self",
      createdAt: now,
      updatedAt: now,
    })
    const spousalRrspId = await ctx.db.insert("registeredAccounts", {
      name: "Spousal RRSP",
      accountType: "RRSP",
      owner: "spouse",
      contributor: "self",
      createdAt: now,
      updatedAt: now,
    })
    const myTfsaId = await ctx.db.insert("registeredAccounts", {
      name: "My TFSA",
      accountType: "TFSA",
      owner: "self",
      contributor: "self",
      roomStartYear: 2009,
      createdAt: now,
      updatedAt: now,
    })
    const spouseTfsaId = await ctx.db.insert("registeredAccounts", {
      name: "Spouse TFSA",
      accountType: "TFSA",
      owner: "spouse",
      contributor: "spouse",
      roomStartYear: 2012,
      createdAt: now,
      updatedAt: now,
    })
    const respId = await ctx.db.insert("registeredAccounts", {
      name: "Family RESP",
      accountType: "RESP",
      owner: "self",
      contributor: "self",
      beneficiaryId,
      createdAt: now,
      updatedAt: now,
    })

    // ========================================================================
    // 10. Registered Transactions (~25 over 3 years)
    // ========================================================================
    const regTxData = [
      // RRSP contributions
      { regAcctId: myRrspId, type: "contribution" as const, amount: 10000, date: "2024-02-15", taxYear: 2023 },
      { regAcctId: myRrspId, type: "contribution" as const, amount: 12000, date: "2025-01-20", taxYear: 2024 },
      { regAcctId: myRrspId, type: "contribution" as const, amount: 5000, date: "2025-03-01", taxYear: 2024 },
      { regAcctId: myRrspId, type: "contribution" as const, amount: 8000, date: "2026-01-10", taxYear: 2025 },
      { regAcctId: spousalRrspId, type: "contribution" as const, amount: 6000, date: "2024-03-01", taxYear: 2023 },
      { regAcctId: spousalRrspId, type: "contribution" as const, amount: 7000, date: "2025-02-15", taxYear: 2024 },
      { regAcctId: spousalRrspId, type: "contribution" as const, amount: 5000, date: "2026-01-15", taxYear: 2025 },
      // TFSA contributions
      { regAcctId: myTfsaId, type: "contribution" as const, amount: 7000, date: "2024-01-15", taxYear: 2024 },
      { regAcctId: myTfsaId, type: "contribution" as const, amount: 7000, date: "2025-01-05", taxYear: 2025 },
      { regAcctId: myTfsaId, type: "contribution" as const, amount: 7000, date: "2026-01-08", taxYear: 2026 },
      { regAcctId: spouseTfsaId, type: "contribution" as const, amount: 6500, date: "2024-01-20", taxYear: 2024 },
      { regAcctId: spouseTfsaId, type: "contribution" as const, amount: 7000, date: "2025-01-10", taxYear: 2025 },
      { regAcctId: spouseTfsaId, type: "contribution" as const, amount: 7000, date: "2026-01-12", taxYear: 2026 },
      // TFSA withdrawal
      { regAcctId: myTfsaId, type: "withdrawal" as const, amount: 2000, date: "2024-09-15", taxYear: 2024 },
      // RESP contributions + grants
      { regAcctId: respId, type: "contribution" as const, amount: 2500, date: "2024-02-01", taxYear: 2024 },
      { regAcctId: respId, type: "grant" as const, amount: 500, date: "2024-04-15", taxYear: 2024 },
      { regAcctId: respId, type: "contribution" as const, amount: 2500, date: "2025-01-15", taxYear: 2025 },
      { regAcctId: respId, type: "grant" as const, amount: 500, date: "2025-03-20", taxYear: 2025 },
      { regAcctId: respId, type: "contribution" as const, amount: 2500, date: "2026-01-10", taxYear: 2026 },
    ]

    for (const tx of regTxData) {
      await ctx.db.insert("registeredTransactions", {
        registeredAccountId: tx.regAcctId,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        taxYear: tx.taxYear,
        createdAt: now,
        updatedAt: now,
      })
    }
    console.log(`Seeded ${regTxData.length} registered transactions`)

    // ========================================================================
    // 11. Tax Year Snapshots (NOA data)
    // ========================================================================
    const snapshots = [
      { person: "self" as const, accountType: "RRSP" as const, taxYear: 2023, earnedIncome: 92000, noaDeductionLimit: 35420 },
      { person: "self" as const, accountType: "RRSP" as const, taxYear: 2024, earnedIncome: 98500, noaDeductionLimit: 41800 },
      { person: "spouse" as const, accountType: "RRSP" as const, taxYear: 2023, earnedIncome: 75000, noaDeductionLimit: 28500 },
      { person: "spouse" as const, accountType: "RRSP" as const, taxYear: 2024, earnedIncome: 78000, noaDeductionLimit: 32100 },
      { person: "self" as const, accountType: "TFSA" as const, taxYear: 2024, craRoomAsOfJan1: 95000 },
      { person: "spouse" as const, accountType: "TFSA" as const, taxYear: 2024, craRoomAsOfJan1: 75500 },
    ]

    for (const s of snapshots) {
      await ctx.db.insert("taxYearSnapshots", {
        person: s.person,
        accountType: s.accountType,
        taxYear: s.taxYear,
        earnedIncome: "earnedIncome" in s ? s.earnedIncome : undefined,
        noaDeductionLimit: "noaDeductionLimit" in s ? s.noaDeductionLimit : undefined,
        craRoomAsOfJan1: "craRoomAsOfJan1" in s ? s.craRoomAsOfJan1 : undefined,
        notes: "Imported from NOA",
        createdAt: now,
        updatedAt: now,
      })
    }
    console.log(`Seeded ${snapshots.length} tax year snapshots`)

    // ========================================================================
    // 12. Weekly Summary
    // ========================================================================
    await ctx.db.insert("weeklySummaries", {
      summary: `## Weekly Financial Summary\n\n**Total spending this week:** $1,247.83\n\n**Top categories:**\n- Groceries: $412.30 (Costco $287.45, Save-On-Foods $124.85)\n- Food & Dining: $178.50 (3 restaurant visits)\n- Transportation: $142.80 (gas + parking)\n- Utilities: $198.32 (BC Hydro bill)\n\n**Notable:** Your grocery spending is 8% below your monthly average. The Costco trip included a split transaction — $198.30 for groceries and $89.15 for household items.\n\n**Upcoming:** Mortgage payment ($2,100) due on the 1st. ICBC insurance ($150) due on the 5th.`,
      generatedAt: now,
    })

    console.log("Demo seed complete!")
    return {
      seeded: true,
      message: `Seeded: ${seedCategories.length} categories, ${txCounter} transactions, ${invTxCounter} investment transactions, ${regTxData.length} registered transactions, 6 accounts, 8 securities, 5 registered accounts`,
    }
  },
})

// ============================================================================
// DAILY TRANSACTION GENERATION (called by cron)
// ============================================================================

export const generateDailyTransactions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const today = new Date()
    const rand = seededRandom(now) // Use current time as seed for variety

    // Find the chequing and credit accounts
    const accounts = await ctx.db.query("accounts").collect()
    const chequing = accounts.find((a) => a.subtype === "checking")
    const credit = accounts.find((a) => a.subtype === "credit card")
    if (!chequing || !credit) {
      console.log("No chequing/credit accounts found, skipping daily generation")
      return
    }

    // Get categories
    const categories = await ctx.db.query("categories").collect()
    const categoryMap = new Map(categories.map((c) => [c.name, c._id]))

    // Get subcategories
    const subcategories = await ctx.db.query("subcategories").collect()
    const subcatMap = new Map(subcategories.map((s) => [`${s.categoryId}::${s.name}`, s._id]))

    // Find existing transaction count for today to avoid duplicates
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayEnd = todayStart + 86400000
    const existingToday = await ctx.db
      .query("transactions")
      .withIndex("by_date", (q) => q.gte("date", todayStart).lt("date", todayEnd))
      .collect()

    if (existingToday.length > 0) {
      console.log(`Already have ${existingToday.length} transactions for today, skipping`)
      return
    }

    // Generate 3-8 random transactions for today
    const txCount = Math.floor(randomBetween(rand, 3, 8))
    let generated = 0

    const dailyMerchants = [
      { name: "Tim Hortons", merchant: "Tim Hortons", category: "🍔 Food", sub: "Coffee Shops", min: 3.5, max: 12, acct: credit },
      { name: "Starbucks", merchant: "Starbucks", category: "🍔 Food", sub: "Coffee Shops", min: 5, max: 15, acct: credit },
      { name: "Save-On-Foods", merchant: "Save-On-Foods", category: "🛒 Groceries", sub: "Save-on-Foods", min: 30, max: 120, acct: credit },
      { name: "No Frills", merchant: "No Frills", category: "🛒 Groceries", sub: "No-frills", min: 25, max: 80, acct: credit },
      { name: "Petro-Canada", merchant: "Petro-Canada", category: "🚗 Transportation", sub: "Gasoline/Supercharger", min: 45, max: 90, acct: credit },
      { name: "Amazon.ca", merchant: "Amazon", category: "✨ Personal & Giving", sub: "Shopping", min: 12, max: 95, acct: credit },
      { name: "McDonald's", merchant: "McDonald's", category: "🍔 Food", sub: "Restaurants", min: 8, max: 25, acct: credit },
      { name: "DoorDash", merchant: "DoorDash", category: "🍔 Food", sub: "Takeout & Delivery", min: 20, max: 55, acct: credit },
      { name: "Shoppers Drug Mart", merchant: "Shoppers Drug Mart", category: "⚕️ Health & Wellness", sub: "Personal Care (Haircuts)", min: 8, max: 45, acct: credit },
      { name: "Canadian Tire", merchant: "Canadian Tire", category: "✨ Personal & Giving", sub: "Shopping", min: 15, max: 80, acct: credit },
    ]

    // Shuffle and pick txCount merchants
    const shuffled = [...dailyMerchants].sort(() => rand() - 0.5)

    for (let i = 0; i < txCount && i < shuffled.length; i++) {
      const m = shuffled[i]
      const amount = randomBetween(rand, m.min, m.max)
      const catId = categoryMap.get(m.category)

      // 80% get categorized, 20% left uncategorized
      const shouldCategorize = rand() > 0.2

      // Find subcategory
      let subId: Id<"subcategories"> | undefined
      if (shouldCategorize && catId) {
        const subKey = `${catId}::${m.sub}`
        subId = subcatMap.get(subKey)
      }

      generated++
      const txDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Math.floor(rand() * 12) + 8, Math.floor(rand() * 60))

      await ctx.db.insert("transactions", {
        plaidTransactionId: `demo_daily_${now}_${generated}`,
        accountId: m.acct._id,
        amount: -amount,
        isoCurrencyCode: "CAD",
        date: txDate.getTime(),
        datetime: txDate.toISOString(),
        pending: false,
        merchantName: m.merchant,
        name: m.name,
        categoryId: shouldCategorize ? catId : undefined,
        subcategoryId: shouldCategorize ? subId : undefined,
        files: [],
        isSplit: false,
        isManual: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Update account balances
    const totalSpent = generated * 35 // approximate average
    await ctx.db.patch(credit._id, {
      currentBalance: (credit.currentBalance ?? 0) - totalSpent,
      updatedAt: now,
    })

    // Weekly: generate an investment buy (on Mondays)
    if (today.getDay() === 1) {
      const invAccounts = accounts.filter((a) => a.type === "investment")
      const tfsaAcct = invAccounts.find((a) => a.subtype === "tfsa")
      if (tfsaAcct) {
        const securities = await ctx.db.query("securities").collect()
        const xeqt = securities.find((s) => s.tickerSymbol === "XEQT")
        if (xeqt) {
          await ctx.db.insert("investmentTransactions", {
            plaidInvestmentTransactionId: `demo_weekly_inv_${now}`,
            accountId: tfsaAcct._id,
            securityId: xeqt._id,
            type: "buy",
            amount: 125,
            price: randomBetween(rand, 29, 33),
            quantity: randomBetween(rand, 3.8, 4.3),
            isoCurrencyCode: "CAD",
            date: now,
            transactionDatetime: today.toISOString(),
            name: "Weekly XEQT Buy",
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }

    // Cleanup: delete transactions older than 18 months
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 18, 1).getTime()
    const oldTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_date", (q) => q.lt("date", cutoff))
      .collect()

    for (const oldTx of oldTransactions) {
      // Delete associated tags first
      const txTags = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (q) => q.eq("transactionId", oldTx._id))
        .collect()
      for (const tag of txTags) {
        await ctx.db.delete(tag._id)
      }
      await ctx.db.delete(oldTx._id)
    }

    if (oldTransactions.length > 0) {
      console.log(`Cleaned up ${oldTransactions.length} old transactions`)
    }

    console.log(`Generated ${generated} daily transactions`)
  },
})
