// convex/migrations/import.ts
// Internal mutations for importing data from Prisma export
// Run these in order via a script or Convex dashboard

// NOTE: Using mutation instead of mutation for migration script access
// After migration is complete, these can be deleted
import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

// Helper to get mapped ID
export const getMappedId = query({
  args: { tableName: v.string(), oldId: v.string() },
  handler: async (ctx, { tableName, oldId }) => {
    const mapping = await ctx.db
      .query("idMappings")
      .withIndex("by_table_oldId", (q) => q.eq("tableName", tableName).eq("oldId", oldId))
      .first()
    return mapping?.newId ?? null
  },
})

// ============================================================================
// INDEPENDENT TABLES (no foreign keys)
// ============================================================================

export const importInstitutions = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        name: v.string(),
        logoUrl: v.optional(v.union(v.string(), v.null())),
        shortName: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("institutions", {
        name: row.name,
        logoUrl: row.logoUrl ?? undefined,
        shortName: row.shortName ?? undefined,
        createdAt: row.createdAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "institutions",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importCategories = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.union(v.string(), v.null())),
        groupType: v.optional(
          v.union(v.literal("EXPENSES"), v.literal("INCOME"), v.literal("INVESTMENT"), v.literal("TRANSFER"), v.null()),
        ),
        displayOrder: v.optional(v.union(v.number(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("categories", {
        name: row.name,
        imageUrl: row.imageUrl ?? undefined,
        groupType: row.groupType ?? undefined,
        displayOrder: row.displayOrder ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "categories",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importTags = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        name: v.string(),
        color: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("tags", {
        name: row.name,
        color: row.color,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "tags",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importUsers = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        email: v.string(),
        emailVerified: v.boolean(),
        name: v.optional(v.union(v.string(), v.null())),
        image: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("users", {
        email: row.email,
        emailVerified: row.emailVerified,
        name: row.name ?? undefined,
        image: row.image ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "users",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importWeeklySummaries = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        summary: v.string(),
        generatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("weeklySummaries", {
        summary: row.summary,
        generatedAt: row.generatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "weeklySummaries",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importVerifications = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        identifier: v.string(),
        value: v.string(),
        expiresAt: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("verifications", {
        identifier: row.identifier,
        value: row.value,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "verifications",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

// ============================================================================
// FIRST-LEVEL DEPENDENCIES
// ============================================================================

export const importSubcategories = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldCategoryId: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0
    for (const row of data) {
      const categoryMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "categories").eq("oldId", row._oldCategoryId))
        .first()

      if (!categoryMapping) {
        console.error(`No category mapping for ${row._oldCategoryId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("subcategories", {
        categoryId: categoryMapping.newId as Id<"categories">,
        name: row.name,
        imageUrl: row.imageUrl ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "subcategories",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

export const importItems = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldInstitutionId: v.optional(v.union(v.string(), v.null())),
        plaidItemId: v.string(),
        accessToken: v.string(),
        status: v.optional(v.union(v.string(), v.null())),
        lastTransactionsCursor: v.optional(v.union(v.string(), v.null())),
        lastInvestmentsCursor: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      let institutionId: Id<"institutions"> | undefined

      if (row._oldInstitutionId) {
        const instMapping = await ctx.db
          .query("idMappings")
          .withIndex("by_table_oldId", (q) => q.eq("tableName", "institutions").eq("oldId", row._oldInstitutionId!))
          .first()
        institutionId = instMapping?.newId as Id<"institutions"> | undefined
      }

      const newId = await ctx.db.insert("items", {
        plaidItemId: row.plaidItemId,
        accessToken: row.accessToken,
        institutionId,
        status: row.status ?? undefined,
        lastTransactionsCursor: row.lastTransactionsCursor ?? undefined,
        lastInvestmentsCursor: row.lastInvestmentsCursor ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "items",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

export const importSessions = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldUserId: v.string(),
        token: v.string(),
        expiresAt: v.number(),
        ipAddress: v.optional(v.union(v.string(), v.null())),
        userAgent: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0
    for (const row of data) {
      const userMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "users").eq("oldId", row._oldUserId))
        .first()

      if (!userMapping) {
        console.error(`No user mapping for ${row._oldUserId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("sessions", {
        userId: userMapping.newId as Id<"users">,
        token: row.token,
        expiresAt: row.expiresAt,
        ipAddress: row.ipAddress ?? undefined,
        userAgent: row.userAgent ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "sessions",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

export const importOAuthAccounts = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldUserId: v.string(),
        providerId: v.string(),
        accountId: v.string(),
        accessToken: v.optional(v.union(v.string(), v.null())),
        refreshToken: v.optional(v.union(v.string(), v.null())),
        expiresAt: v.optional(v.union(v.number(), v.null())),
        accessTokenExpiresAt: v.optional(v.union(v.number(), v.null())),
        refreshTokenExpiresAt: v.optional(v.union(v.number(), v.null())),
        scope: v.optional(v.union(v.string(), v.null())),
        idToken: v.optional(v.union(v.string(), v.null())),
        password: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0
    for (const row of data) {
      const userMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "users").eq("oldId", row._oldUserId))
        .first()

      if (!userMapping) {
        console.error(`No user mapping for ${row._oldUserId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("oauthAccounts", {
        userId: userMapping.newId as Id<"users">,
        providerId: row.providerId,
        accountId: row.accountId,
        accessToken: row.accessToken ?? undefined,
        refreshToken: row.refreshToken ?? undefined,
        expiresAt: row.expiresAt ?? undefined,
        accessTokenExpiresAt: row.accessTokenExpiresAt ?? undefined,
        refreshTokenExpiresAt: row.refreshTokenExpiresAt ?? undefined,
        scope: row.scope ?? undefined,
        idToken: row.idToken ?? undefined,
        password: row.password ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "oauthAccounts",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

export const importPasskeys = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldUserId: v.string(),
        name: v.optional(v.union(v.string(), v.null())),
        publicKey: v.string(),
        credentialID: v.string(),
        counter: v.number(),
        deviceType: v.string(),
        backedUp: v.boolean(),
        transports: v.optional(v.union(v.string(), v.null())),
        aaguid: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0
    for (const row of data) {
      const userMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "users").eq("oldId", row._oldUserId))
        .first()

      if (!userMapping) {
        console.error(`No user mapping for ${row._oldUserId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("passkeys", {
        userId: userMapping.newId as Id<"users">,
        name: row.name ?? undefined,
        publicKey: row.publicKey,
        credentialID: row.credentialID,
        counter: row.counter,
        deviceType: row.deviceType,
        backedUp: row.backedUp,
        transports: row.transports ?? undefined,
        aaguid: row.aaguid ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "passkeys",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

// ============================================================================
// SECOND-LEVEL DEPENDENCIES
// ============================================================================

export const importAccounts = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldItemId: v.string(),
        plaidAccountId: v.string(),
        name: v.string(),
        officialName: v.optional(v.union(v.string(), v.null())),
        mask: v.optional(v.union(v.string(), v.null())),
        type: v.string(),
        subtype: v.optional(v.union(v.string(), v.null())),
        currency: v.optional(v.union(v.string(), v.null())),
        currentBalance: v.optional(v.union(v.number(), v.null())),
        availableBalance: v.optional(v.union(v.number(), v.null())),
        creditLimit: v.optional(v.union(v.number(), v.null())),
        balanceUpdatedAt: v.optional(v.union(v.number(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0
    for (const row of data) {
      const itemMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "items").eq("oldId", row._oldItemId))
        .first()

      if (!itemMapping) {
        console.error(`No item mapping for ${row._oldItemId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("accounts", {
        plaidAccountId: row.plaidAccountId,
        itemId: itemMapping.newId as Id<"items">,
        name: row.name,
        officialName: row.officialName ?? undefined,
        mask: row.mask ?? undefined,
        type: row.type,
        subtype: row.subtype ?? undefined,
        currency: row.currency ?? undefined,
        currentBalance: row.currentBalance ?? undefined,
        availableBalance: row.availableBalance ?? undefined,
        creditLimit: row.creditLimit ?? undefined,
        balanceUpdatedAt: row.balanceUpdatedAt ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "accounts",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

export const importSecurities = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        plaidSecurityId: v.string(),
        name: v.optional(v.union(v.string(), v.null())),
        tickerSymbol: v.optional(v.union(v.string(), v.null())),
        type: v.optional(v.union(v.string(), v.null())),
        isoCurrencyCode: v.optional(v.union(v.string(), v.null())),
        logoUrl: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    for (const row of data) {
      const newId = await ctx.db.insert("securities", {
        plaidSecurityId: row.plaidSecurityId,
        name: row.name ?? undefined,
        tickerSymbol: row.tickerSymbol ?? undefined,
        type: row.type ?? undefined,
        isoCurrencyCode: row.isoCurrencyCode ?? undefined,
        logoUrl: row.logoUrl ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "securities",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported }
  },
})

// ============================================================================
// THIRD-LEVEL DEPENDENCIES
// ============================================================================

export const importTransactions = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldAccountId: v.string(),
        _oldCategoryId: v.optional(v.union(v.string(), v.null())),
        _oldSubcategoryId: v.optional(v.union(v.string(), v.null())),
        _oldParentTransactionId: v.optional(v.union(v.string(), v.null())),
        plaidTransactionId: v.string(),
        amount: v.number(),
        isoCurrencyCode: v.optional(v.union(v.string(), v.null())),
        date: v.number(),
        authorizedDate: v.optional(v.union(v.number(), v.null())),
        datetime: v.string(),
        authorizedDatetime: v.optional(v.union(v.string(), v.null())),
        pending: v.boolean(),
        merchantName: v.optional(v.union(v.string(), v.null())),
        name: v.string(),
        plaidCategory: v.optional(v.union(v.string(), v.null())),
        plaidSubcategory: v.optional(v.union(v.string(), v.null())),
        paymentChannel: v.optional(v.union(v.string(), v.null())),
        pendingTransactionId: v.optional(v.union(v.string(), v.null())),
        logoUrl: v.optional(v.union(v.string(), v.null())),
        categoryIconUrl: v.optional(v.union(v.string(), v.null())),
        notes: v.optional(v.union(v.string(), v.null())),
        files: v.array(v.string()),
        isSplit: v.boolean(),
        isManual: v.boolean(),
        originalTransactionId: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0

    for (const row of data) {
      const accountMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "accounts").eq("oldId", row._oldAccountId))
        .first()

      if (!accountMapping) {
        console.error(`No account mapping for ${row._oldAccountId}`)
        skipped++
        continue
      }

      let categoryId: Id<"categories"> | undefined
      if (row._oldCategoryId) {
        const catMapping = await ctx.db
          .query("idMappings")
          .withIndex("by_table_oldId", (q) => q.eq("tableName", "categories").eq("oldId", row._oldCategoryId!))
          .first()
        categoryId = catMapping?.newId as Id<"categories"> | undefined
      }

      let subcategoryId: Id<"subcategories"> | undefined
      if (row._oldSubcategoryId) {
        const subMapping = await ctx.db
          .query("idMappings")
          .withIndex("by_table_oldId", (q) => q.eq("tableName", "subcategories").eq("oldId", row._oldSubcategoryId!))
          .first()
        subcategoryId = subMapping?.newId as Id<"subcategories"> | undefined
      }

      // Note: parentTransactionId handled in second pass
      const newId = await ctx.db.insert("transactions", {
        plaidTransactionId: row.plaidTransactionId,
        accountId: accountMapping.newId as Id<"accounts">,
        amount: row.amount,
        isoCurrencyCode: row.isoCurrencyCode ?? undefined,
        date: row.date,
        authorizedDate: row.authorizedDate ?? undefined,
        datetime: row.datetime,
        authorizedDatetime: row.authorizedDatetime ?? undefined,
        pending: row.pending,
        merchantName: row.merchantName ?? undefined,
        name: row.name,
        plaidCategory: row.plaidCategory ?? undefined,
        plaidSubcategory: row.plaidSubcategory ?? undefined,
        paymentChannel: row.paymentChannel ?? undefined,
        pendingTransactionId: row.pendingTransactionId ?? undefined,
        logoUrl: row.logoUrl ?? undefined,
        categoryIconUrl: row.categoryIconUrl ?? undefined,
        categoryId,
        subcategoryId,
        notes: row.notes ?? undefined,
        files: row.files,
        isSplit: row.isSplit,
        isManual: row.isManual,
        parentTransactionId: undefined, // Set in second pass
        originalTransactionId: row.originalTransactionId ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })

      await ctx.db.insert("idMappings", {
        tableName: "transactions",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

// Second pass: Update parent transaction references
export const updateParentTransactionRefs = mutation({
  args: {
    mappings: v.array(
      v.object({
        oldId: v.string(),
        oldParentId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { mappings }) => {
    let updated = 0
    let skipped = 0

    for (const { oldId, oldParentId } of mappings) {
      const txMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "transactions").eq("oldId", oldId))
        .first()

      const parentMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "transactions").eq("oldId", oldParentId))
        .first()

      if (txMapping && parentMapping) {
        await ctx.db.patch(txMapping.newId as Id<"transactions">, {
          parentTransactionId: parentMapping.newId as Id<"transactions">,
        })
        updated++
      } else {
        skipped++
      }
    }
    return { updated, skipped }
  },
})

export const importHoldings = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldAccountId: v.string(),
        _oldSecurityId: v.string(),
        quantity: v.number(),
        costBasis: v.optional(v.union(v.number(), v.null())),
        institutionPrice: v.optional(v.union(v.number(), v.null())),
        institutionPriceAsOf: v.optional(v.union(v.number(), v.null())),
        isoCurrencyCode: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0

    for (const row of data) {
      const accountMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "accounts").eq("oldId", row._oldAccountId))
        .first()

      const securityMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "securities").eq("oldId", row._oldSecurityId))
        .first()

      if (!accountMapping || !securityMapping) {
        console.error(`Missing mapping: account=${row._oldAccountId}, security=${row._oldSecurityId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("holdings", {
        accountId: accountMapping.newId as Id<"accounts">,
        securityId: securityMapping.newId as Id<"securities">,
        quantity: row.quantity,
        costBasis: row.costBasis ?? undefined,
        institutionPrice: row.institutionPrice ?? undefined,
        institutionPriceAsOf: row.institutionPriceAsOf ?? undefined,
        isoCurrencyCode: row.isoCurrencyCode ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "holdings",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

export const importInvestmentTransactions = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldAccountId: v.string(),
        _oldSecurityId: v.optional(v.union(v.string(), v.null())),
        plaidInvestmentTransactionId: v.string(),
        type: v.string(),
        amount: v.optional(v.union(v.number(), v.null())),
        price: v.optional(v.union(v.number(), v.null())),
        quantity: v.optional(v.union(v.number(), v.null())),
        fees: v.optional(v.union(v.number(), v.null())),
        isoCurrencyCode: v.optional(v.union(v.string(), v.null())),
        date: v.number(),
        transactionDatetime: v.optional(v.union(v.string(), v.null())),
        name: v.optional(v.union(v.string(), v.null())),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0

    for (const row of data) {
      const accountMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "accounts").eq("oldId", row._oldAccountId))
        .first()

      if (!accountMapping) {
        console.error(`No account mapping for ${row._oldAccountId}`)
        skipped++
        continue
      }

      let securityId: Id<"securities"> | undefined
      if (row._oldSecurityId) {
        const secMapping = await ctx.db
          .query("idMappings")
          .withIndex("by_table_oldId", (q) => q.eq("tableName", "securities").eq("oldId", row._oldSecurityId!))
          .first()
        securityId = secMapping?.newId as Id<"securities"> | undefined
      }

      const newId = await ctx.db.insert("investmentTransactions", {
        plaidInvestmentTransactionId: row.plaidInvestmentTransactionId,
        accountId: accountMapping.newId as Id<"accounts">,
        securityId,
        type: row.type,
        amount: row.amount ?? undefined,
        price: row.price ?? undefined,
        quantity: row.quantity ?? undefined,
        fees: row.fees ?? undefined,
        isoCurrencyCode: row.isoCurrencyCode ?? undefined,
        date: row.date,
        transactionDatetime: row.transactionDatetime ?? undefined,
        name: row.name ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "investmentTransactions",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})

// ============================================================================
// JUNCTION TABLES
// ============================================================================

export const importTransactionTags = mutation({
  args: {
    data: v.array(
      v.object({
        _oldId: v.string(),
        _oldTransactionId: v.string(),
        _oldTagId: v.string(),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, { data }) => {
    let imported = 0
    let skipped = 0

    for (const row of data) {
      const txMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "transactions").eq("oldId", row._oldTransactionId))
        .first()

      const tagMapping = await ctx.db
        .query("idMappings")
        .withIndex("by_table_oldId", (q) => q.eq("tableName", "tags").eq("oldId", row._oldTagId))
        .first()

      if (!txMapping || !tagMapping) {
        console.error(`Missing mapping: tx=${row._oldTransactionId}, tag=${row._oldTagId}`)
        skipped++
        continue
      }

      const newId = await ctx.db.insert("transactionTags", {
        transactionId: txMapping.newId as Id<"transactions">,
        tagId: tagMapping.newId as Id<"tags">,
        createdAt: row.createdAt,
      })
      await ctx.db.insert("idMappings", {
        tableName: "transactionTags",
        oldId: row._oldId,
        newId: newId,
      })
      imported++
    }
    return { imported, skipped }
  },
})
