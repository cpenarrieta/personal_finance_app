import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // ============================================================================
  // PLAID INTEGRATION TABLES
  // ============================================================================

  institutions: defineTable({
    plaidInstitutionId: v.optional(v.string()),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    shortName: v.optional(v.string()),
    createdAt: v.number(), // ms timestamp
  })
    .index("by_name", ["name"])
    .index("by_plaidInstitutionId", ["plaidInstitutionId"]),

  items: defineTable({
    plaidItemId: v.string(),
    accessToken: v.string(),
    institutionId: v.optional(v.id("institutions")),
    status: v.optional(v.string()),
    lastTransactionsCursor: v.optional(v.string()),
    lastInvestmentsCursor: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_plaidItemId", ["plaidItemId"]),

  // ============================================================================
  // ACCOUNTS (PlaidAccount in Prisma)
  // ============================================================================

  accounts: defineTable({
    plaidAccountId: v.string(),
    itemId: v.id("items"),
    name: v.string(),
    officialName: v.optional(v.string()),
    mask: v.optional(v.string()),
    type: v.string(),
    subtype: v.optional(v.string()),
    currency: v.optional(v.string()),
    currentBalance: v.optional(v.number()),
    availableBalance: v.optional(v.number()),
    creditLimit: v.optional(v.number()),
    balanceUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plaidAccountId", ["plaidAccountId"])
    .index("by_itemId", ["itemId"])
    .index("by_type", ["type"]),

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  transactions: defineTable({
    plaidTransactionId: v.string(),
    accountId: v.id("accounts"),
    // Single amount field (negative=expense, positive=income)
    amount: v.number(),
    isoCurrencyCode: v.optional(v.string()),
    // Dates: date as ms timestamp, datetime as ISO string from Plaid
    date: v.number(), // ms timestamp
    authorizedDate: v.optional(v.number()),
    datetime: v.string(), // ISO 8601 string
    authorizedDatetime: v.optional(v.string()),
    pending: v.boolean(),
    merchantName: v.optional(v.string()),
    name: v.string(),
    plaidCategory: v.optional(v.string()),
    plaidSubcategory: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    pendingTransactionId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    categoryIconUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("subcategories")),
    notes: v.optional(v.string()),
    files: v.array(v.string()),
    isSplit: v.boolean(),
    isManual: v.boolean(),
    parentTransactionId: v.optional(v.id("transactions")),
    originalTransactionId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plaidTransactionId", ["plaidTransactionId"])
    .index("by_accountId", ["accountId"])
    .index("by_date", ["date"])
    .index("by_categoryId", ["categoryId"])
    .index("by_subcategoryId", ["subcategoryId"])
    .index("by_pending", ["pending"])
    .index("by_parentTransactionId", ["parentTransactionId"])
    .index("by_originalTransactionId", ["originalTransactionId"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_merchant", { searchField: "merchantName" }),

  // ============================================================================
  // CATEGORIES & TAGS
  // ============================================================================

  categories: defineTable({
    name: v.string(),
    imageUrl: v.optional(v.string()),
    groupType: v.optional(
      v.union(v.literal("EXPENSES"), v.literal("INCOME"), v.literal("INVESTMENT"), v.literal("TRANSFER")),
    ),
    displayOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_groupType", ["groupType"]),

  subcategories: defineTable({
    categoryId: v.id("categories"),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_name", ["name"]),

  tags: defineTable({
    name: v.string(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  transactionTags: defineTable({
    transactionId: v.id("transactions"),
    tagId: v.id("tags"),
    createdAt: v.number(),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_tagId", ["tagId"]),

  // ============================================================================
  // INVESTMENTS
  // ============================================================================

  securities: defineTable({
    plaidSecurityId: v.string(),
    name: v.optional(v.string()),
    tickerSymbol: v.optional(v.string()),
    type: v.optional(v.string()),
    isoCurrencyCode: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plaidSecurityId", ["plaidSecurityId"])
    .index("by_tickerSymbol", ["tickerSymbol"]),

  holdings: defineTable({
    accountId: v.id("accounts"),
    securityId: v.id("securities"),
    quantity: v.number(),
    costBasis: v.optional(v.number()),
    institutionPrice: v.optional(v.number()),
    institutionPriceAsOf: v.optional(v.number()),
    isoCurrencyCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_accountId", ["accountId"])
    .index("by_securityId", ["securityId"]),

  investmentTransactions: defineTable({
    plaidInvestmentTransactionId: v.string(),
    accountId: v.id("accounts"),
    securityId: v.optional(v.id("securities")),
    type: v.string(),
    amount: v.optional(v.number()),
    price: v.optional(v.number()),
    quantity: v.optional(v.number()),
    fees: v.optional(v.number()),
    isoCurrencyCode: v.optional(v.string()),
    date: v.number(), // ms timestamp
    transactionDatetime: v.optional(v.string()),
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plaidInvestmentTransactionId", ["plaidInvestmentTransactionId"])
    .index("by_accountId", ["accountId"])
    .index("by_securityId", ["securityId"]),

  // ============================================================================
  // FEATURES
  // ============================================================================

  weeklySummaries: defineTable({
    summary: v.string(),
    generatedAt: v.number(),
  }).index("by_generatedAt", ["generatedAt"]),

  // ============================================================================
  // AUTH (Managed by @convex-dev/better-auth component)
  // ============================================================================
  // Auth tables (users, sessions, accounts, verifications, passkeys, jwks, etc.)
  // are automatically managed by the Better Auth component.
  // See convex/convex.config.ts for component configuration.
})
