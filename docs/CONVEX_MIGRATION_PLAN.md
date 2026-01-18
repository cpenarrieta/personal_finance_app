# Prisma to Convex Migration Plan

This document outlines a comprehensive plan to migrate the personal finance app from Prisma/PostgreSQL to Convex.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [New Convex Schema Design](#new-convex-schema-design)
4. [Data Migration Strategy](#data-migration-strategy)
5. [Query/Mutation Migration Guide](#querymutation-migration-guide)
6. [Implementation Phases](#implementation-phases)
7. [Benefits & Tradeoffs](#benefits--tradeoffs)

---

## Executive Summary

### Why Migrate to Convex?

1. **Real-time by default**: Convex provides automatic reactive subscriptions - no need for manual cache invalidation with `revalidateTag()`
2. **Simplified data flow**: No more "generated columns" hack (`amount_number`, `created_at_string`) - Convex handles serialization automatically
3. **Type-safe end-to-end**: Full TypeScript from schema to client
4. **Serverless functions**: Queries, mutations, and actions replace API routes
5. **Built-in scheduling**: Native cron jobs and scheduled functions for Plaid sync

### Key Simplifications

| Current Pattern | Convex Solution |
|----------------|-----------------|
| `amount` (Decimal) + `amount_number` (Float) | Single `amount` (number) field |
| `createdAt` (DateTime) + `created_at_string` (String) | Single `createdAt` (number, ms timestamp) - serialize on client |
| `"use cache"` + `cacheTag()` + `revalidateTag()` | Automatic reactivity via `useQuery()` |
| API routes + Server Actions | Convex mutations and actions |
| Prisma relations + joins | Document IDs + helper functions |

---

## Current Architecture Analysis

### Database Schema (18 Tables)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│ Institution (5 fields)     │ Item (9 fields)                    │
│ Account (18 fields)        │ Transaction (28 fields)            │
│ Category (8 fields)        │ Subcategory (6 fields)             │
│ Tag (5 fields)             │ TransactionTag (3 fields) [junction]│
├─────────────────────────────────────────────────────────────────┤
│                      INVESTMENT TABLES                           │
├─────────────────────────────────────────────────────────────────┤
│ Security (9 fields)        │ Holding (14 fields)                │
│ InvestmentTransaction (16) │ StockPrice (7 fields)              │
├─────────────────────────────────────────────────────────────────┤
│                      FEATURE TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│ CategoryRule (7 fields)    │ WeeklySummary (4 fields)           │
│ LlmChat (5 fields)         │ LlmMessage (7 fields)              │
├─────────────────────────────────────────────────────────────────┤
│                        AUTH TABLES                               │
├─────────────────────────────────────────────────────────────────┤
│ user (7 fields)            │ session (5 fields)                 │
│ account [oauth] (12 fields)│ verification (5 fields)            │
└─────────────────────────────────────────────────────────────────┘
```

### Generated Columns Pattern (To Be Eliminated)

Current pattern uses PostgreSQL generated columns to avoid DateTime serialization issues:

```prisma
// Current Prisma schema
model Transaction {
  amount         Decimal    // Source: DECIMAL(14,2)
  amount_number  Float      // Generated: CAST(amount * -1 AS DOUBLE)

  datetime       DateTime   // Source timestamp
  created_at_string String? // Generated: TO_CHAR(createdAt, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  updated_at_string String? // Generated: TO_CHAR(updatedAt, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
}
```

**Why this existed**: Next.js Server Components cannot pass Date objects to Client Components. The workaround was database-level string generation.

**Convex solution**: Store timestamps as milliseconds (numbers). Format on client using `new Date(timestamp)` or `Intl.DateTimeFormat`.

---

## New Convex Schema Design

### Schema File: `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================================
  // PLAID INTEGRATION TABLES
  // ============================================================================

  institutions: defineTable({
    name: v.string(),
    plaidInstitutionId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  }),

  items: defineTable({
    plaidItemId: v.string(),
    accessToken: v.string(), // Encrypted in production
    institutionId: v.optional(v.id("institutions")),
    status: v.optional(v.string()),
    lastTransactionsCursor: v.optional(v.string()),
    lastInvestmentsCursor: v.optional(v.string()),
    createdAt: v.number(), // ms timestamp
    updatedAt: v.number(),
  })
    .index("by_plaidItemId", ["plaidItemId"]),

  // ============================================================================
  // ACCOUNTS
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
    balanceUpdatedAt: v.optional(v.number()), // ms timestamp
    isHidden: v.boolean(),
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

    // Amount: Single field, stored as display value (negative=expense, positive=income)
    // This replaces both `amount` (Decimal) and `amount_number` (Float)
    amount: v.number(),

    isoCurrencyCode: v.optional(v.string()),

    // Dates: Store as ISO 8601 strings from Plaid (they come as strings anyway)
    // This is simpler than timestamps for calendar dates
    datetime: v.string(), // "2024-03-21T14:30:00Z"
    authorizedDatetime: v.optional(v.string()),

    pending: v.boolean(),
    merchantName: v.optional(v.string()),
    name: v.string(),

    // Plaid's original categorization (for reference)
    plaidCategory: v.optional(v.string()),
    plaidSubcategory: v.optional(v.string()),

    paymentChannel: v.optional(v.string()),
    pendingTransactionId: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    categoryIconUrl: v.optional(v.string()),

    // User categorization
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("subcategories")),

    // User notes and files
    notes: v.optional(v.string()),
    files: v.optional(v.array(v.string())), // Cloudinary URLs

    // Split transaction support
    isSplit: v.boolean(),
    parentTransactionId: v.optional(v.id("transactions")),
    originalTransactionId: v.optional(v.string()),

    // Review system
    reviewTags: v.optional(v.array(v.string())),

    createdAt: v.number(), // ms timestamp
    updatedAt: v.number(),
  })
    .index("by_plaidTransactionId", ["plaidTransactionId"])
    .index("by_accountId", ["accountId"])
    .index("by_datetime", ["datetime"])
    .index("by_categoryId", ["categoryId"])
    .index("by_subcategoryId", ["subcategoryId"])
    .index("by_pending", ["pending"])
    .index("by_parentTransactionId", ["parentTransactionId"])
    // Compound indexes for common filter combinations
    .index("by_categoryId_datetime", ["categoryId", "datetime"])
    .index("by_accountId_datetime", ["accountId", "datetime"])
    .index("by_accountId_categoryId", ["accountId", "categoryId"])
    // Search indexes for text search
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_merchant", { searchField: "merchantName" })
    // Search index with category filter (for filtering by category while searching)
    .searchIndex("search_name_with_category", {
      searchField: "name",
      filterFields: ["categoryId", "accountId", "pending"]
    }),

  // ============================================================================
  // CATEGORIES & TAGS
  // ============================================================================

  categories: defineTable({
    name: v.string(),
    imageUrl: v.optional(v.string()),
    // Matches Prisma enum: EXPENSES, INCOME, INVESTMENT, TRANSFER
    groupType: v.optional(v.union(
      v.literal("EXPENSES"),
      v.literal("INCOME"),
      v.literal("INVESTMENT"),
      v.literal("TRANSFER")
    )),
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
  })
    .index("by_name", ["name"]),

  // Junction table for many-to-many: Transaction <-> Tag
  transactionTags: defineTable({
    transactionId: v.id("transactions"),
    tagId: v.id("tags"),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_tagId", ["tagId"]),

  // ============================================================================
  // CATEGORY RULES (Auto-categorization)
  // ============================================================================

  categoryRules: defineTable({
    name: v.string(),
    pattern: v.string(), // Regex or exact match
    matchType: v.union(v.literal("contains"), v.literal("exact"), v.literal("regex")),
    categoryId: v.id("categories"),
    subcategoryId: v.optional(v.id("subcategories")),
    priority: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_priority", ["priority"])
    .index("by_isActive", ["isActive"]),

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
    institutionPriceAsOf: v.optional(v.number()), // ms timestamp
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
    transactionDatetime: v.optional(v.string()), // ISO 8601
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_plaidInvestmentTransactionId", ["plaidInvestmentTransactionId"])
    .index("by_accountId", ["accountId"])
    .index("by_securityId", ["securityId"]),

  stockPrices: defineTable({
    securityId: v.id("securities"),
    tickerSymbol: v.string(),
    price: v.number(),
    priceDate: v.string(), // "YYYY-MM-DD"
    source: v.string(), // "alpha_vantage", "plaid", etc.
    createdAt: v.number(),
  })
    .index("by_securityId", ["securityId"])
    .index("by_tickerSymbol_date", ["tickerSymbol", "priceDate"]),

  // ============================================================================
  // AI FEATURES
  // ============================================================================

  weeklySummaries: defineTable({
    summary: v.string(),
    generatedAt: v.number(), // ms timestamp
  })
    .index("by_generatedAt", ["generatedAt"]),

  llmChats: defineTable({
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"]),

  llmMessages: defineTable({
    chatId: v.id("llmChats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.string()), // JSON string of tool calls
    createdAt: v.number(),
  })
    .index("by_chatId", ["chatId"])
    .index("by_chatId_createdAt", ["chatId", "createdAt"]),

  // ============================================================================
  // AUTH (Better Auth compatible)
  // ============================================================================

  users: defineTable({
    email: v.string(),
    emailVerified: v.boolean(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),

  oauthAccounts: defineTable({
    userId: v.id("users"),
    providerId: v.string(), // "google", "github"
    providerAccountId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    idToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_provider", ["providerId", "providerAccountId"]),

  verifications: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_identifier", ["identifier"]),
});
```

### Key Schema Design Decisions

#### 1. Eliminated Duplicate Columns

| Old (Prisma) | New (Convex) | Rationale |
|--------------|--------------|-----------|
| `amount` (Decimal) + `amount_number` (Float) | `amount` (number) | Convex numbers are floats; store display value directly |
| `createdAt` (DateTime) + `created_at_string` (String) | `createdAt` (number) | Store as ms timestamp; format on client |
| `datetime` (DateTime) | `datetime` (string) | Keep as ISO 8601 string from Plaid |

#### 2. Date Handling Strategy

```typescript
// For point-in-time timestamps (createdAt, updatedAt):
createdAt: v.number(), // Store as Date.now() - milliseconds since epoch

// For calendar dates from Plaid:
datetime: v.string(), // Keep as ISO 8601: "2024-03-21T14:30:00Z"

// Client-side formatting:
const date = new Date(transaction.createdAt);
const formatted = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(date);
```

#### 3. Relations via Document IDs

```typescript
// One-to-many: Account -> Transactions
transactions: defineTable({
  accountId: v.id("accounts"), // Foreign key
  // ...
}).index("by_accountId", ["accountId"]) // Index for efficient queries

// Many-to-many: Transaction <-> Tag (via junction table)
transactionTags: defineTable({
  transactionId: v.id("transactions"),
  tagId: v.id("tags"),
})
  .index("by_transactionId", ["transactionId"])
  .index("by_tagId", ["tagId"])
```

---

## Data Migration Strategy

### Phase 1: Prepare Export Scripts

Create a script to export each Prisma table to JSONL format:

```typescript
// scripts/export-to-jsonl.ts
import { prisma } from "@/lib/db/prisma";
import * as fs from "fs";

async function exportTable(tableName: string, query: () => Promise<any[]>, transform: (row: any) => any) {
  const rows = await query();
  const jsonl = rows.map(row => JSON.stringify(transform(row))).join('\n');
  fs.writeFileSync(`exports/${tableName}.jsonl`, jsonl);
  console.log(`Exported ${rows.length} rows to ${tableName}.jsonl`);
}

// Example: Export transactions
await exportTable(
  'transactions',
  () => prisma.transaction.findMany({ include: { tags: true } }),
  (t) => ({
    _id: t.id, // Preserve original ID for reference mapping
    plaidTransactionId: t.plaidTransactionId,
    accountId: t.accountId, // Will need ID mapping
    amount: t.amount_number, // Use the already-converted value
    isoCurrencyCode: t.isoCurrencyCode,
    datetime: t.datetime, // Already ISO string from Plaid
    authorizedDatetime: t.authorizedDatetime,
    pending: t.pending,
    merchantName: t.merchantName,
    name: t.name,
    plaidCategory: t.category,
    plaidSubcategory: t.subcategory,
    paymentChannel: t.paymentChannel,
    pendingTransactionId: t.pendingTransactionId,
    logoUrl: t.logoUrl,
    categoryIconUrl: t.categoryIconUrl,
    categoryId: t.categoryId,
    subcategoryId: t.subcategoryId,
    notes: t.notes,
    files: t.files,
    isSplit: t.isSplit,
    parentTransactionId: t.parentTransactionId,
    originalTransactionId: t.originalTransactionId,
    reviewTags: t.reviewTags,
    createdAt: new Date(t.createdAt).getTime(),
    updatedAt: new Date(t.updatedAt).getTime(),
    // Store tag IDs for later junction table creation
    _tagIds: t.tags.map(tt => tt.tagId),
  })
);
```

### Phase 2: Import Order (Respecting Dependencies)

```bash
# 1. Independent tables first (no foreign keys)
npx convex import --table institutions exports/institutions.jsonl
npx convex import --table categories exports/categories.jsonl
npx convex import --table tags exports/tags.jsonl
npx convex import --table users exports/users.jsonl

# 2. First-level dependencies
npx convex import --table subcategories exports/subcategories.jsonl
npx convex import --table items exports/items.jsonl
npx convex import --table categoryRules exports/categoryRules.jsonl
npx convex import --table sessions exports/sessions.jsonl
npx convex import --table oauthAccounts exports/oauthAccounts.jsonl
npx convex import --table verifications exports/verifications.jsonl
npx convex import --table llmChats exports/llmChats.jsonl
npx convex import --table weeklySummaries exports/weeklySummaries.jsonl

# 3. Second-level dependencies
npx convex import --table accounts exports/accounts.jsonl
npx convex import --table securities exports/securities.jsonl
npx convex import --table llmMessages exports/llmMessages.jsonl

# 4. Third-level dependencies
npx convex import --table transactions exports/transactions.jsonl
npx convex import --table holdings exports/holdings.jsonl
npx convex import --table investmentTransactions exports/investmentTransactions.jsonl
npx convex import --table stockPrices exports/stockPrices.jsonl

# 5. Junction tables last
npx convex import --table transactionTags exports/transactionTags.jsonl
```

### Phase 3: ID Mapping Strategy (Recommended: Temporary Migration Table)

Since Convex generates its own `_id` values and we want to use Convex's auto-generated IDs (not preserve old Prisma IDs), we'll use a **temporary migration table** approach:

#### Step 1: Add Temporary Migration Schema

```typescript
// convex/schema.ts - ADD THIS TEMPORARILY during migration
// Remove after migration is complete and verified

idMappings: defineTable({
  tableName: v.string(),    // e.g., "accounts", "transactions", "categories"
  oldId: v.string(),        // Original Prisma UUID
  newId: v.string(),        // New Convex ID (stored as string for flexibility)
}).index("by_table_oldId", ["tableName", "oldId"])
  .index("by_table_newId", ["tableName", "newId"]),
```

#### Step 2: Migration Process

```typescript
// convex/migrations/importWithMapping.ts
import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Helper to get mapped ID
export const getMappedId = internalQuery({
  args: { tableName: v.string(), oldId: v.string() },
  handler: async (ctx, { tableName, oldId }) => {
    const mapping = await ctx.db
      .query("idMappings")
      .withIndex("by_table_oldId", q =>
        q.eq("tableName", tableName).eq("oldId", oldId)
      )
      .first();
    return mapping?.newId ?? null;
  },
});

// Import categories (no dependencies - import first)
export const importCategories = internalMutation({
  args: { categories: v.array(v.any()) },
  handler: async (ctx, { categories }) => {
    for (const cat of categories) {
      const newId = await ctx.db.insert("categories", {
        name: cat.name,
        imageUrl: cat.imageUrl,
        groupType: cat.groupType,
        displayOrder: cat.displayOrder,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      });

      // Store the mapping
      await ctx.db.insert("idMappings", {
        tableName: "categories",
        oldId: cat._oldId, // Original Prisma ID passed in export
        newId: newId,
      });
    }
  },
});

// Import transactions (depends on accounts, categories, subcategories)
export const importTransactions = internalMutation({
  args: { transactions: v.array(v.any()) },
  handler: async (ctx, { transactions }) => {
    for (const t of transactions) {
      // Look up mapped IDs for foreign keys
      const accountMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", q =>
          q.eq("tableName", "accounts").eq("oldId", t._oldAccountId)
        )
        .first();

      const categoryMapping = t._oldCategoryId ? await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", q =>
          q.eq("tableName", "categories").eq("oldId", t._oldCategoryId)
        )
        .first() : null;

      const subcategoryMapping = t._oldSubcategoryId ? await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", q =>
          q.eq("tableName", "subcategories").eq("oldId", t._oldSubcategoryId)
        )
        .first() : null;

      if (!accountMapping) {
        console.error(`No account mapping found for ${t._oldAccountId}`);
        continue;
      }

      const newId = await ctx.db.insert("transactions", {
        plaidTransactionId: t.plaidTransactionId,
        accountId: accountMapping.newId as any, // Cast to Id<"accounts">
        amount: t.amount,
        isoCurrencyCode: t.isoCurrencyCode,
        datetime: t.datetime,
        authorizedDatetime: t.authorizedDatetime,
        pending: t.pending,
        merchantName: t.merchantName,
        name: t.name,
        plaidCategory: t.plaidCategory,
        plaidSubcategory: t.plaidSubcategory,
        paymentChannel: t.paymentChannel,
        pendingTransactionId: t.pendingTransactionId,
        logoUrl: t.logoUrl,
        categoryIconUrl: t.categoryIconUrl,
        categoryId: categoryMapping?.newId as any ?? undefined,
        subcategoryId: subcategoryMapping?.newId as any ?? undefined,
        notes: t.notes,
        files: t.files ?? [],
        isSplit: t.isSplit,
        parentTransactionId: undefined, // Handle in second pass
        originalTransactionId: t.originalTransactionId,
        reviewTags: t.reviewTags ?? [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      });

      await ctx.db.insert("idMappings", {
        tableName: "transactions",
        oldId: t._oldId,
        newId: newId,
      });
    }
  },
});

// Second pass: Update parent transaction references
export const updateParentTransactionRefs = internalMutation({
  args: { mappings: v.array(v.object({ oldId: v.string(), oldParentId: v.string() })) },
  handler: async (ctx, { mappings }) => {
    for (const { oldId, oldParentId } of mappings) {
      const txMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", q =>
          q.eq("tableName", "transactions").eq("oldId", oldId)
        )
        .first();

      const parentMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", q =>
          q.eq("tableName", "transactions").eq("oldId", oldParentId)
        )
        .first();

      if (txMapping && parentMapping) {
        await ctx.db.patch(txMapping.newId as any, {
          parentTransactionId: parentMapping.newId as any,
        });
      }
    }
  },
});
```

#### Step 3: Export Script with Old IDs

```typescript
// scripts/export-for-convex.ts
// Export data with _oldId fields for mapping

const transactions = await prisma.transaction.findMany({
  include: { tags: { include: { tag: true } } },
});

const exportData = transactions.map(t => ({
  _oldId: t.id,                    // For mapping table
  _oldAccountId: t.accountId,      // For FK resolution
  _oldCategoryId: t.categoryId,    // For FK resolution
  _oldSubcategoryId: t.subcategoryId,
  _oldParentTransactionId: t.parentTransactionId, // For second pass
  _tagOldIds: t.tags.map(tt => tt.tagId), // For junction table
  // ... actual data fields
  plaidTransactionId: t.plaidTransactionId,
  amount: Number(t.amount) * -1, // Convert Decimal and flip sign
  // ... rest of fields
}));
```

#### Step 4: Cleanup After Verification

```typescript
// convex/migrations/cleanup.ts
export const deleteIdMappings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allMappings = await ctx.db.query("idMappings").collect();
    for (const mapping of allMappings) {
      await ctx.db.delete(mapping._id);
    }
    return { deleted: allMappings.length };
  },
});
```

Then remove `idMappings` table from schema.ts and run `npx convex dev` to apply.

### Phase 4: Comprehensive Validation Script

```typescript
// convex/migrations/validate.ts
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Expected counts from Prisma export (pass these in)
interface ExpectedCounts {
  institutions: number;
  items: number;
  accounts: number;
  transactions: number;
  categories: number;
  subcategories: number;
  tags: number;
  transactionTags: number;
  holdings: number;
  securities: number;
  investmentTransactions: number;
  stockPrices: number;
  categoryRules: number;
  weeklySummaries: number;
  llmChats: number;
  llmMessages: number;
  users: number;
  sessions: number;
  oauthAccounts: number;
  verifications: number;
}

export const validateMigration = internalQuery({
  args: {
    expectedCounts: v.object({
      institutions: v.number(),
      items: v.number(),
      accounts: v.number(),
      transactions: v.number(),
      categories: v.number(),
      subcategories: v.number(),
      tags: v.number(),
      transactionTags: v.number(),
      holdings: v.number(),
      securities: v.number(),
      investmentTransactions: v.number(),
      stockPrices: v.number(),
      categoryRules: v.number(),
      weeklySummaries: v.number(),
      llmChats: v.number(),
      llmMessages: v.number(),
      users: v.number(),
      sessions: v.number(),
      oauthAccounts: v.number(),
      verifications: v.number(),
    }),
    // Sample Prisma data for spot-checking
    sampleTransactions: v.optional(v.array(v.object({
      plaidTransactionId: v.string(),
      amount: v.number(),
      name: v.string(),
    }))),
  },
  handler: async (ctx, { expectedCounts, sampleTransactions }) => {
    const results: {
      countComparison: Record<string, { expected: number; actual: number; match: boolean }>;
      relationshipIntegrity: {
        orphanedTransactions: number;
        orphanedHoldings: number;
        orphanedSubcategories: number;
        orphanedTransactionTags: number;
        orphanedLlmMessages: number;
        invalidCategoryRefs: number;
        invalidSubcategoryRefs: number;
      };
      dataIntegrity: {
        transactionsWithoutPlaidId: number;
        accountsWithoutPlaidId: number;
        transactionsWithInvalidAmount: number;
        transactionsWithInvalidDatetime: number;
      };
      sampleDataVerification: {
        checked: number;
        matched: number;
        mismatches: Array<{ plaidTransactionId: string; field: string; expected: any; actual: any }>;
      };
      summary: {
        allCountsMatch: boolean;
        allRelationsValid: boolean;
        allDataValid: boolean;
        allSamplesMatch: boolean;
        overallSuccess: boolean;
      };
    } = {
      countComparison: {},
      relationshipIntegrity: {
        orphanedTransactions: 0,
        orphanedHoldings: 0,
        orphanedSubcategories: 0,
        orphanedTransactionTags: 0,
        orphanedLlmMessages: 0,
        invalidCategoryRefs: 0,
        invalidSubcategoryRefs: 0,
      },
      dataIntegrity: {
        transactionsWithoutPlaidId: 0,
        accountsWithoutPlaidId: 0,
        transactionsWithInvalidAmount: 0,
        transactionsWithInvalidDatetime: 0,
      },
      sampleDataVerification: {
        checked: 0,
        matched: 0,
        mismatches: [],
      },
      summary: {
        allCountsMatch: true,
        allRelationsValid: true,
        allDataValid: true,
        allSamplesMatch: true,
        overallSuccess: true,
      },
    };

    // ========================================
    // 1. COUNT COMPARISON
    // ========================================
    const tables = [
      "institutions", "items", "accounts", "transactions", "categories",
      "subcategories", "tags", "transactionTags", "holdings", "securities",
      "investmentTransactions", "stockPrices", "categoryRules", "weeklySummaries",
      "llmChats", "llmMessages", "users", "sessions", "oauthAccounts", "verifications"
    ] as const;

    for (const table of tables) {
      const actual = (await ctx.db.query(table as any).collect()).length;
      const expected = expectedCounts[table];
      const match = actual === expected;
      results.countComparison[table] = { expected, actual, match };
      if (!match) results.summary.allCountsMatch = false;
    }

    // ========================================
    // 2. RELATIONSHIP INTEGRITY
    // ========================================

    // Check transactions have valid account references
    const allTransactions = await ctx.db.query("transactions").collect();
    const allAccountIds = new Set((await ctx.db.query("accounts").collect()).map(a => a._id));
    const allCategoryIds = new Set((await ctx.db.query("categories").collect()).map(c => c._id));
    const allSubcategoryIds = new Set((await ctx.db.query("subcategories").collect()).map(s => s._id));

    for (const tx of allTransactions) {
      if (!allAccountIds.has(tx.accountId)) {
        results.relationshipIntegrity.orphanedTransactions++;
      }
      if (tx.categoryId && !allCategoryIds.has(tx.categoryId)) {
        results.relationshipIntegrity.invalidCategoryRefs++;
      }
      if (tx.subcategoryId && !allSubcategoryIds.has(tx.subcategoryId)) {
        results.relationshipIntegrity.invalidSubcategoryRefs++;
      }
    }

    // Check holdings have valid account and security references
    const allHoldings = await ctx.db.query("holdings").collect();
    const allSecurityIds = new Set((await ctx.db.query("securities").collect()).map(s => s._id));
    for (const holding of allHoldings) {
      if (!allAccountIds.has(holding.accountId) || !allSecurityIds.has(holding.securityId)) {
        results.relationshipIntegrity.orphanedHoldings++;
      }
    }

    // Check subcategories have valid category references
    const allSubcategories = await ctx.db.query("subcategories").collect();
    for (const sub of allSubcategories) {
      if (!allCategoryIds.has(sub.categoryId)) {
        results.relationshipIntegrity.orphanedSubcategories++;
      }
    }

    // Check transaction tags have valid references
    const allTransactionTags = await ctx.db.query("transactionTags").collect();
    const allTransactionIds = new Set(allTransactions.map(t => t._id));
    const allTagIds = new Set((await ctx.db.query("tags").collect()).map(t => t._id));
    for (const tt of allTransactionTags) {
      if (!allTransactionIds.has(tt.transactionId) || !allTagIds.has(tt.tagId)) {
        results.relationshipIntegrity.orphanedTransactionTags++;
      }
    }

    // Check LLM messages have valid chat references
    const allLlmMessages = await ctx.db.query("llmMessages").collect();
    const allChatIds = new Set((await ctx.db.query("llmChats").collect()).map(c => c._id));
    for (const msg of allLlmMessages) {
      if (!allChatIds.has(msg.chatId)) {
        results.relationshipIntegrity.orphanedLlmMessages++;
      }
    }

    // Summarize relationship integrity
    const relIntegrity = results.relationshipIntegrity;
    if (Object.values(relIntegrity).some(v => v > 0)) {
      results.summary.allRelationsValid = false;
    }

    // ========================================
    // 3. DATA INTEGRITY
    // ========================================

    for (const tx of allTransactions) {
      if (!tx.plaidTransactionId) {
        results.dataIntegrity.transactionsWithoutPlaidId++;
      }
      if (typeof tx.amount !== 'number' || isNaN(tx.amount)) {
        results.dataIntegrity.transactionsWithInvalidAmount++;
      }
      // Validate datetime is ISO 8601 format
      if (!tx.datetime || !/^\d{4}-\d{2}-\d{2}/.test(tx.datetime)) {
        results.dataIntegrity.transactionsWithInvalidDatetime++;
      }
    }

    const allAccounts = await ctx.db.query("accounts").collect();
    for (const acc of allAccounts) {
      if (!acc.plaidAccountId) {
        results.dataIntegrity.accountsWithoutPlaidId++;
      }
    }

    if (Object.values(results.dataIntegrity).some(v => v > 0)) {
      results.summary.allDataValid = false;
    }

    // ========================================
    // 4. SAMPLE DATA VERIFICATION
    // ========================================

    if (sampleTransactions && sampleTransactions.length > 0) {
      for (const sample of sampleTransactions) {
        results.sampleDataVerification.checked++;

        const convexTx = await ctx.db
          .query("transactions")
          .withIndex("by_plaidTransactionId", q =>
            q.eq("plaidTransactionId", sample.plaidTransactionId)
          )
          .first();

        if (!convexTx) {
          results.sampleDataVerification.mismatches.push({
            plaidTransactionId: sample.plaidTransactionId,
            field: "existence",
            expected: "exists",
            actual: "not found",
          });
          continue;
        }

        let matched = true;

        // Compare amount (with small tolerance for float precision)
        if (Math.abs(convexTx.amount - sample.amount) > 0.01) {
          results.sampleDataVerification.mismatches.push({
            plaidTransactionId: sample.plaidTransactionId,
            field: "amount",
            expected: sample.amount,
            actual: convexTx.amount,
          });
          matched = false;
        }

        // Compare name
        if (convexTx.name !== sample.name) {
          results.sampleDataVerification.mismatches.push({
            plaidTransactionId: sample.plaidTransactionId,
            field: "name",
            expected: sample.name,
            actual: convexTx.name,
          });
          matched = false;
        }

        if (matched) {
          results.sampleDataVerification.matched++;
        }
      }

      if (results.sampleDataVerification.mismatches.length > 0) {
        results.summary.allSamplesMatch = false;
      }
    }

    // ========================================
    // 5. OVERALL SUMMARY
    // ========================================

    results.summary.overallSuccess =
      results.summary.allCountsMatch &&
      results.summary.allRelationsValid &&
      results.summary.allDataValid &&
      results.summary.allSamplesMatch;

    return results;
  },
});

// Helper to generate expected counts from Prisma
// Run this BEFORE migration to get baseline numbers
export const generateExpectedCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    // This would be run against Prisma, not Convex
    // Included here as a template
    return {
      note: "Run equivalent query against Prisma to get expected counts",
      template: `
        const counts = {
          institutions: await prisma.institution.count(),
          items: await prisma.item.count(),
          accounts: await prisma.account.count(),
          transactions: await prisma.transaction.count(),
          categories: await prisma.category.count(),
          subcategories: await prisma.subcategory.count(),
          tags: await prisma.tag.count(),
          transactionTags: await prisma.transactionTag.count(),
          holdings: await prisma.holding.count(),
          securities: await prisma.security.count(),
          investmentTransactions: await prisma.investmentTransaction.count(),
          stockPrices: await prisma.stockPrice.count(),
          categoryRules: await prisma.categoryRule.count(),
          weeklySummaries: await prisma.weeklySummary.count(),
          llmChats: await prisma.llmChat.count(),
          llmMessages: await prisma.llmMessage.count(),
          users: await prisma.user.count(),
          sessions: await prisma.session.count(),
          oauthAccounts: await prisma.account.count(), // OAuth accounts table
          verifications: await prisma.verification.count(),
        };
      `,
    };
  },
});
```

---

## Query/Mutation Migration Guide

### Current Query Pattern (Prisma + Next.js Cache)

```typescript
// Current: src/lib/db/queries/transactions.ts
export async function getAllTransactions() {
  "use cache"
  cacheLife({ stale: 60 * 60 * 24 })
  cacheTag("transactions")

  return prisma.transaction.findMany({
    select: {
      id: true,
      amount_number: true, // Generated column
      datetime: true,
      created_at_string: true, // Generated column
      // ... many fields
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { datetime: "desc" },
  })
}
```

### New Convex Pattern

```typescript
// New: convex/transactions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const transactions = await ctx.db
      .query("transactions")
      .order("desc") // Orders by _creationTime by default
      .collect();

    // Fetch related data
    const withRelations = await Promise.all(
      transactions.map(async (t) => {
        const [account, category, subcategory, tagJunctions] = await Promise.all([
          t.accountId ? ctx.db.get(t.accountId) : null,
          t.categoryId ? ctx.db.get(t.categoryId) : null,
          t.subcategoryId ? ctx.db.get(t.subcategoryId) : null,
          ctx.db
            .query("transactionTags")
            .withIndex("by_transactionId", q => q.eq("transactionId", t._id))
            .collect(),
        ]);

        const tags = await Promise.all(
          tagJunctions.map(tj => ctx.db.get(tj.tagId))
        );

        return {
          ...t,
          account: account ? { id: account._id, name: account.name, type: account.type, mask: account.mask } : null,
          category: category ? { id: category._id, name: category.name } : null,
          subcategory: subcategory ? { id: subcategory._id, name: subcategory.name } : null,
          tags: tags.filter(Boolean).map(tag => ({
            id: tag!._id,
            name: tag!.name,
            color: tag!.color,
          })),
        };
      })
    );

    return withRelations;
  },
});

// Paginated version for large datasets
export const getPaginated = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, limit = 50 }) => {
    let query = ctx.db.query("transactions").order("desc");

    const results = await query.paginate({ cursor, numItems: limit });

    // ... add relations as above

    return {
      transactions: results.page,
      nextCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});
```

### Mutation Pattern Comparison

```typescript
// Current: src/app/api/transactions/bulk-update/route.ts
export async function PATCH(request: NextRequest) {
  const { transactionIds, categoryId, subcategoryId, tagIds } = await request.json();

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: { categoryId, subcategoryId },
  });

  // Handle tags...

  revalidateTag("transactions");
  revalidateTag("dashboard");
}
```

```typescript
// New: convex/transactions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const bulkUpdate = mutation({
  args: {
    transactionIds: v.array(v.id("transactions")),
    categoryId: v.optional(v.id("categories")),
    subcategoryId: v.optional(v.id("subcategories")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, { transactionIds, categoryId, subcategoryId, tagIds }) => {
    const now = Date.now();

    // Update transactions
    await Promise.all(
      transactionIds.map(id =>
        ctx.db.patch(id, {
          ...(categoryId !== undefined && { categoryId }),
          ...(subcategoryId !== undefined && { subcategoryId }),
          updatedAt: now,
        })
      )
    );

    // Handle tags if provided
    if (tagIds !== undefined) {
      // Delete existing tag associations
      for (const transactionId of transactionIds) {
        const existing = await ctx.db
          .query("transactionTags")
          .withIndex("by_transactionId", q => q.eq("transactionId", transactionId))
          .collect();

        await Promise.all(existing.map(tt => ctx.db.delete(tt._id)));
      }

      // Create new associations
      for (const transactionId of transactionIds) {
        for (const tagId of tagIds) {
          await ctx.db.insert("transactionTags", { transactionId, tagId });
        }
      }
    }

    return { updatedCount: transactionIds.length };
    // No manual cache invalidation needed - Convex handles reactivity!
  },
});
```

### Action Pattern for External APIs (Plaid)

```typescript
// New: convex/plaid.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { PlaidApi, Configuration, PlaidEnvironments } from "plaid";

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV!],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
        "PLAID-SECRET": process.env.PLAID_SECRET!,
      },
    },
  })
);

export const syncTransactions = action({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    // 1. Get item details via query
    const item = await ctx.runQuery(internal.items.getById, { itemId });
    if (!item) throw new Error("Item not found");

    // 2. Call Plaid API (external)
    const response = await plaidClient.transactionsSync({
      access_token: item.accessToken,
      cursor: item.lastTransactionsCursor || undefined,
    });

    // 3. Save results via mutation
    await ctx.runMutation(internal.plaid.saveTransactions, {
      itemId,
      added: response.data.added,
      modified: response.data.modified,
      removed: response.data.removed,
      cursor: response.data.next_cursor,
    });

    return {
      added: response.data.added.length,
      modified: response.data.modified.length,
      removed: response.data.removed.length,
    };
  },
});

export const saveTransactions = internalMutation({
  args: {
    itemId: v.id("items"),
    added: v.array(v.any()),
    modified: v.array(v.any()),
    removed: v.array(v.any()),
    cursor: v.string(),
  },
  handler: async (ctx, { itemId, added, modified, removed, cursor }) => {
    const now = Date.now();

    // Process added transactions
    for (const t of added) {
      // Find account
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_plaidAccountId", q => q.eq("plaidAccountId", t.account_id))
        .first();

      if (!account) continue;

      await ctx.db.insert("transactions", {
        plaidTransactionId: t.transaction_id,
        accountId: account._id,
        amount: -t.amount, // Plaid: positive=debit, we want: negative=expense
        isoCurrencyCode: t.iso_currency_code,
        datetime: t.datetime || t.date,
        authorizedDatetime: t.authorized_datetime,
        pending: t.pending,
        merchantName: t.merchant_name,
        name: t.name,
        plaidCategory: t.personal_finance_category?.primary,
        plaidSubcategory: t.personal_finance_category?.detailed,
        paymentChannel: t.payment_channel,
        pendingTransactionId: t.pending_transaction_id,
        logoUrl: t.logo_url,
        categoryIconUrl: t.personal_finance_category_icon_url,
        categoryId: undefined,
        subcategoryId: undefined,
        notes: undefined,
        files: [],
        isSplit: false,
        parentTransactionId: undefined,
        originalTransactionId: undefined,
        reviewTags: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Process modified/removed...

    // Update cursor
    await ctx.db.patch(itemId, {
      lastTransactionsCursor: cursor,
      updatedAt: now,
    });
  },
});
```

### Cron Job for Scheduled Sync (Replaces Vercel Cron)

> **Important**: Convex provides built-in cron job functionality. This means you **no longer need Vercel Cron** (or any external cron service). Convex crons run directly on Convex's infrastructure with these benefits:
>
> - **No Vercel Pro plan required** - Vercel crons require Pro plan for schedules under 1 hour
> - **Seconds-level granularity** - Using `crons.interval()` you can run jobs every few seconds
> - **Integrated with your backend** - No HTTP endpoints to expose, no API keys to manage
> - **Automatic retries** - Convex retries failed mutations automatically
> - **Dashboard visibility** - View cron history and logs in Convex dashboard
>
> After migration, you can **delete your Vercel cron configuration** (`vercel.json` crons section) and remove any `/api/cron/*` routes.

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync all Plaid items every 4 hours
// Replaces: Vercel cron hitting /api/cron/sync-plaid
crons.interval(
  "sync-plaid-transactions",
  { hours: 4 },
  internal.plaid.syncAllItems
);

// Generate weekly summary every Monday at 9am UTC
// Replaces: Vercel cron hitting /api/cron/weekly-summary
crons.weekly(
  "generate-weekly-summary",
  { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
  internal.ai.generateWeeklySummary
);

// You can also use these scheduling methods:
// crons.hourly("job-name", { minuteUTC: 30 }, handler) - Every hour at :30
// crons.daily("job-name", { hourUTC: 2, minuteUTC: 0 }, handler) - Daily at 2am UTC
// crons.monthly("job-name", { day: 1, hourUTC: 0, minuteUTC: 0 }, handler) - 1st of month
// crons.cron("job-name", "0 */6 * * *", handler) - Standard cron syntax (every 6 hours)

export default crons;
```

#### Vercel Cron to Convex Cron Migration

| Vercel Cron | Convex Equivalent |
|-------------|-------------------|
| `"0 */4 * * *"` (every 4 hours) | `crons.interval("name", { hours: 4 }, handler)` |
| `"0 9 * * 1"` (Monday 9am) | `crons.weekly("name", { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 }, handler)` |
| `"0 0 * * *"` (daily midnight) | `crons.daily("name", { hourUTC: 0, minuteUTC: 0 }, handler)` |
| `"*/5 * * * *"` (every 5 min) | `crons.interval("name", { minutes: 5 }, handler)` |

---

## Implementation Phases

### Phase 1: Setup & Schema (1-2 days)

1. **Initialize Convex**
   ```bash
   npm install convex
   npx convex dev
   ```

2. **Create schema file** (`convex/schema.ts`)
   - Define all tables with proper types
   - Add indexes for common queries
   - Add search indexes for text search

3. **Set up environment variables**
   ```env
   CONVEX_DEPLOYMENT=your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

4. **Create ConvexClientProvider**
   ```typescript
   // app/ConvexClientProvider.tsx
   "use client";
   import { ConvexProvider, ConvexReactClient } from "convex/react";

   const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

   export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
     return <ConvexProvider client={convex}>{children}</ConvexProvider>;
   }
   ```

### Phase 2: Data Migration (1 day)

1. **Pause Plaid webhooks** (set status to inactive in Plaid dashboard)

2. **Export data from PostgreSQL**
   ```bash
   npm run export:prisma  # Custom script to export all tables
   ```

3. **Transform data** (handle ID mappings, date conversions)

4. **Import to Convex**
   ```bash
   npm run import:convex  # Import in dependency order
   ```

5. **Validate migration**
   - Run validation queries
   - Spot-check data in Convex dashboard

### Phase 3: Core Functions Migration (3-5 days)

**Priority order** (based on usage frequency):

1. **Transaction queries/mutations**
   - `getAllTransactions` → `convex/transactions.ts:getAll`
   - `getTransactionById` → `convex/transactions.ts:getById`
   - `bulkUpdateTransactions` → `convex/transactions.ts:bulkUpdate`
   - `updateTransaction` → `convex/transactions.ts:update`
   - `createSplitTransaction` → `convex/transactions.ts:createSplit`

2. **Category/Tag queries**
   - `getAllCategories` → `convex/categories.ts:getAll`
   - `getAllTags` → `convex/tags.ts:getAll`
   - CRUD operations for each

3. **Account queries**
   - `getAllAccounts` → `convex/accounts.ts:getAll`
   - `getAccountBalances` → `convex/accounts.ts:getBalances`

4. **Dashboard aggregations**
   - `getDashboardStats` → `convex/dashboard.ts:getStats`
   - Monthly/weekly spending summaries

5. **Investment queries**
   - Holdings, securities, investment transactions

6. **AI features**
   - LLM chat history
   - Weekly summaries

### Phase 4: Plaid Integration Migration (2 days)

1. **Create Plaid action** (`convex/plaid.ts`)
   - Transaction sync action
   - Investment sync action
   - Webhook handler (HTTP action)

2. **Set up cron jobs** (`convex/crons.ts`)
   - Scheduled sync every 4 hours
   - Or rely on webhooks

3. **Migrate webhook endpoint**
   - From `/api/webhooks/plaid` to Convex HTTP action
   - Update Plaid dashboard with new URL

4. **Re-enable Plaid webhooks**

### Phase 5: Client Migration (2-3 days)

1. **Update data fetching in pages**
   ```typescript
   // Before (Server Component with cache)
   const transactions = await getAllTransactions();

   // After (Client Component with useQuery)
   const transactions = useQuery(api.transactions.getAll);
   ```

2. **Update mutations**
   ```typescript
   // Before
   await fetch('/api/transactions/bulk-update', { method: 'PATCH', body: ... });

   // After
   const bulkUpdate = useMutation(api.transactions.bulkUpdate);
   await bulkUpdate({ transactionIds, categoryId });
   ```

3. **Handle loading states**
   - Convex returns `undefined` while loading
   - Add loading skeletons

4. **Remove old code**
   - Delete `src/lib/db/queries/`
   - Delete API routes
   - Delete Prisma schema and migrations

### Phase 6: Cleanup & Testing (1-2 days)

1. **Remove Prisma dependencies**
   ```bash
   npm uninstall prisma @prisma/client
   rm -rf prisma/
   ```

2. **Update types**
   - Remove `src/types/client.ts` (no more generated columns)
   - Use Convex-generated types from `convex/_generated/`

3. **Update documentation**
   - Update CLAUDE.md
   - Update README

4. **Testing**
   - Manual testing of all features
   - Verify real-time updates work

---

## Benefits & Tradeoffs

### Benefits

1. **Eliminated Complexity**
   - No more generated columns (`amount_number`, `created_at_string`)
   - No more manual cache invalidation (`revalidateTag`)
   - No more API routes for data operations
   - Single source of truth for data types

2. **Real-time by Default**
   - All UI updates automatically when data changes
   - No polling or manual refresh needed
   - Multiple browser tabs stay in sync

3. **Better Developer Experience**
   - End-to-end TypeScript
   - Convex dashboard for debugging
   - Built-in function logging

4. **Simpler Architecture**
   - Functions replace API routes
   - Schema replaces Prisma migrations
   - Built-in scheduling replaces external cron services

### Tradeoffs

1. **Learning Curve**
   - New patterns for queries/mutations
   - Different relationship handling (no JOINs)

2. **Vendor Lock-in**
   - Data stored in Convex cloud
   - Convex-specific function syntax

3. **Pagination Differences**
   - Cursor-based pagination only
   - No offset-based pagination

4. **Relationship Queries**
   - No automatic JOINs - must fetch related data manually
   - Can use convex-helpers for relationship patterns

---

## Files to Create/Modify

### New Files (Convex)

```
convex/
├── schema.ts                 # Database schema
├── _generated/               # Auto-generated (don't edit)
├── transactions.ts           # Transaction queries/mutations
├── categories.ts             # Category queries/mutations
├── subcategories.ts          # Subcategory queries/mutations
├── tags.ts                   # Tag queries/mutations
├── accounts.ts               # Account queries/mutations
├── items.ts                  # Plaid item queries/mutations
├── institutions.ts           # Institution queries/mutations
├── holdings.ts               # Holding queries/mutations
├── securities.ts             # Security queries/mutations
├── investmentTransactions.ts # Investment transaction queries/mutations
├── stockPrices.ts            # Stock price queries/mutations
├── categoryRules.ts          # Category rule queries/mutations
├── dashboard.ts              # Dashboard aggregation queries
├── plaid.ts                  # Plaid sync actions
├── ai.ts                     # AI/LLM actions (OpenAI calls)
├── llmChats.ts               # Chat history queries/mutations
├── weeklySummaries.ts        # Weekly summary queries/mutations
├── auth.ts                   # Auth queries/mutations (Better Auth integration)
├── crons.ts                  # Cron job definitions
├── http.ts                   # HTTP actions (webhooks)
└── migrations/
    └── validate.ts           # Migration validation queries
```

### Files to Modify

```
app/
├── ConvexClientProvider.tsx  # NEW: Convex provider
├── layout.tsx                # Add ConvexClientProvider
├── (app)/
│   ├── page.tsx              # Update to use Convex queries
│   ├── transactions/
│   │   └── page.tsx          # Update data fetching
│   ├── accounts/
│   │   └── page.tsx          # Update data fetching
│   └── ... (all pages)
```

### Files to Delete

```
src/
├── lib/db/
│   ├── prisma.ts             # DELETE
│   └── queries/              # DELETE entire directory
├── app/api/
│   ├── transactions/         # DELETE (replaced by Convex mutations)
│   ├── categories/           # DELETE
│   ├── tags/                 # DELETE
│   ├── webhooks/plaid/       # DELETE (moved to Convex HTTP action)
│   └── ... (most API routes)
├── types/
│   └── client.ts             # DELETE (no more generated columns)
prisma/
├── schema.prisma             # DELETE
└── migrations/               # DELETE entire directory
```

---

## Quick Reference: Query Migration Map

| Prisma Query | Convex Query | Notes |
|--------------|--------------|-------|
| `getAllTransactions` | `api.transactions.getAll` | Add pagination |
| `getTransactionById` | `api.transactions.getById` | |
| `getAllCategories` | `api.categories.getAll` | With subcategories |
| `getAllTags` | `api.tags.getAll` | |
| `getAllAccounts` | `api.accounts.getAll` | |
| `getHoldings` | `api.holdings.getAll` | |
| `getDashboardStats` | `api.dashboard.getStats` | Aggregations |
| `getLatestWeeklySummary` | `api.weeklySummaries.getLatest` | |
| `getLlmChatHistory` | `api.llmChats.getHistory` | |

## Quick Reference: Mutation Migration Map

| API Route | Convex Mutation | Notes |
|-----------|-----------------|-------|
| `PATCH /api/transactions/bulk-update` | `api.transactions.bulkUpdate` | |
| `PATCH /api/transactions/[id]` | `api.transactions.update` | |
| `POST /api/transactions/split` | `api.transactions.createSplit` | |
| `POST /api/categories` | `api.categories.create` | |
| `PATCH /api/categories/[id]` | `api.categories.update` | |
| `DELETE /api/categories/[id]` | `api.categories.remove` | |
| `POST /api/tags` | `api.tags.create` | |
| `POST /api/sync` | `api.plaid.syncTransactions` | Action, not mutation |

---

## Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Convex + Next.js Guide](https://docs.convex.dev/client/nextjs/)
- [Convex Relationship Helpers](https://stack.convex.dev/functional-relationships-helpers)
- [Date Handling in Convex](https://www.convex.dev/typescript/ecosystems-integrations/date-time/typescript-date)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Actions (External API Calls)](https://docs.convex.dev/functions/actions)
- [Scheduled Functions & Crons](https://docs.convex.dev/scheduling/cron-jobs)
