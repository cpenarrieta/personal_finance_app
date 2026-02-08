import { query, mutation, type QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import {
  calculateTFSARoom,
  calculateRRSPRoom,
  calculateRESPRoom,
  calculateTFSAPenalties,
  calculateRRSPPenalties,
  checkNOADiscrepancy,
  type Transaction,
  type TaxYearSnapshot,
} from "./lib/roomCalculations"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const accountTypeValidator = v.union(v.literal("RRSP"), v.literal("TFSA"), v.literal("RESP"))
const personValidator = v.union(v.literal("self"), v.literal("spouse"))
const txTypeValidator = v.union(v.literal("contribution"), v.literal("withdrawal"), v.literal("grant"))

function getCurrentYear(): number {
  return new Date().getFullYear()
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("registeredAccounts").collect()
    return Promise.all(
      accounts.map(async (a) => {
        const beneficiary = a.beneficiaryId ? await ctx.db.get(a.beneficiaryId) : null
        return {
          id: a._id,
          name: a.name,
          accountType: a.accountType,
          owner: a.owner,
          contributor: a.contributor,
          beneficiaryId: a.beneficiaryId ?? null,
          beneficiary: beneficiary
            ? { id: beneficiary._id, name: beneficiary.name, dateOfBirth: beneficiary.dateOfBirth }
            : null,
          roomStartYear: a.roomStartYear ?? null,
          notes: a.notes ?? null,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }
      }),
    )
  },
})

export const getAccountWithRoom = query({
  args: { accountId: v.id("registeredAccounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId)
    if (!account) return null

    const currentYear = getCurrentYear()

    // Get transactions for this account
    const rawTxs = await ctx.db
      .query("registeredTransactions")
      .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", accountId))
      .collect()

    const transactions: Transaction[] = rawTxs.map((t) => ({
      type: t.type,
      amount: t.amount,
      date: t.date,
      taxYear: t.taxYear,
      registeredAccountId: t.registeredAccountId,
    }))

    let room
    if (account.accountType === "RESP") {
      // RESP: room is per beneficiary ($50K lifetime)
      // Need all transactions across all RESP accounts for this beneficiary
      const beneficiary = account.beneficiaryId ? await ctx.db.get(account.beneficiaryId) : null
      if (!beneficiary) {
        room = calculateRESPRoom("2020-01-01", currentYear, transactions)
      } else {
        const allRESPAccounts = await ctx.db
          .query("registeredAccounts")
          .withIndex("by_beneficiaryId", (q) => q.eq("beneficiaryId", account.beneficiaryId!))
          .collect()

        const allTxs: Transaction[] = []
        for (const respAcct of allRESPAccounts) {
          const txs = await ctx.db
            .query("registeredTransactions")
            .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", respAcct._id))
            .collect()
          allTxs.push(
            ...txs.map((t) => ({
              type: t.type,
              amount: t.amount,
              date: t.date,
              taxYear: t.taxYear,
              registeredAccountId: t.registeredAccountId,
            })),
          )
        }

        room = calculateRESPRoom(beneficiary.dateOfBirth, currentYear, allTxs)
      }
    } else {
      // Get snapshots for this person + account type
      const snapshots = await getSnapshotsForPerson(ctx, account.contributor, account.accountType)

      if (account.accountType === "TFSA") {
        const startYear = account.roomStartYear ?? 2009
        room = calculateTFSARoom(startYear, currentYear, transactions, snapshots)
      } else {
        // RRSP: need ALL contributions sharing this contributor's room pool
        const allRRSPAccounts = await ctx.db
          .query("registeredAccounts")
          .withIndex("by_contributor", (q) => q.eq("contributor", account.contributor))
          .collect()
        const rrspAccountIds = allRRSPAccounts.filter((a) => a.accountType === "RRSP").map((a) => a._id)

        const allTxs: Transaction[] = []
        for (const id of rrspAccountIds) {
          const txs = await ctx.db
            .query("registeredTransactions")
            .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", id))
            .collect()
          allTxs.push(
            ...txs.map((t) => ({
              type: t.type,
              amount: t.amount,
              date: t.date,
              taxYear: t.taxYear,
              registeredAccountId: t.registeredAccountId,
            })),
          )
        }

        room = calculateRRSPRoom(currentYear, allTxs, snapshots)
      }
    }

    // Format transactions for output
    const formattedTxs = rawTxs
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        date: t.date,
        taxYear: t.taxYear,
        notes: t.notes ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))

    const beneficiary = account.beneficiaryId ? await ctx.db.get(account.beneficiaryId) : null

    return {
      id: account._id,
      name: account.name,
      accountType: account.accountType,
      owner: account.owner,
      contributor: account.contributor,
      beneficiaryId: account.beneficiaryId ?? null,
      beneficiary: beneficiary
        ? { id: beneficiary._id, name: beneficiary.name, dateOfBirth: beneficiary.dateOfBirth }
        : null,
      roomStartYear: account.roomStartYear ?? null,
      notes: account.notes ?? null,
      room,
      transactions: formattedTxs,
    }
  },
})

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("registeredAccounts").collect()
    const currentYear = getCurrentYear()

    const results = await Promise.all(
      accounts.map(async (account) => {
        const rawTxs = await ctx.db
          .query("registeredTransactions")
          .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", account._id))
          .collect()

        const snapshots = await getSnapshotsForPerson(ctx, account.contributor, account.accountType)

        const transactions: Transaction[] = rawTxs.map((t) => ({
          type: t.type,
          amount: t.amount,
          date: t.date,
          taxYear: t.taxYear,
          registeredAccountId: t.registeredAccountId,
        }))

        let room
        if (account.accountType === "RESP") {
          const beneficiary = account.beneficiaryId ? await ctx.db.get(account.beneficiaryId) : null
          if (!beneficiary) {
            room = calculateRESPRoom("2020-01-01", currentYear, transactions)
          } else {
            // Aggregate all RESP txs for this beneficiary
            const allRESPAccounts = await ctx.db
              .query("registeredAccounts")
              .withIndex("by_beneficiaryId", (q) => q.eq("beneficiaryId", account.beneficiaryId!))
              .collect()
            const allTxs: Transaction[] = []
            for (const respAcct of allRESPAccounts) {
              const txs = await ctx.db
                .query("registeredTransactions")
                .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", respAcct._id))
                .collect()
              allTxs.push(
                ...txs.map((t) => ({
                  type: t.type,
                  amount: t.amount,
                  date: t.date,
                  taxYear: t.taxYear,
                  registeredAccountId: t.registeredAccountId,
                })),
              )
            }
            room = calculateRESPRoom(beneficiary.dateOfBirth, currentYear, allTxs)
          }
        } else if (account.accountType === "TFSA") {
          const startYear = account.roomStartYear ?? 2009
          room = calculateTFSARoom(startYear, currentYear, transactions, snapshots)
        } else {
          // RRSP: need all contributions for this contributor
          const allRRSPAccounts = await ctx.db
            .query("registeredAccounts")
            .withIndex("by_contributor", (q) => q.eq("contributor", account.contributor))
            .collect()
          const rrspAccountIds = allRRSPAccounts.filter((a) => a.accountType === "RRSP").map((a) => a._id)

          const allTxs: Transaction[] = []
          for (const id of rrspAccountIds) {
            const txs = await ctx.db
              .query("registeredTransactions")
              .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", id))
              .collect()
            allTxs.push(
              ...txs.map((t) => ({
                type: t.type,
                amount: t.amount,
                date: t.date,
                taxYear: t.taxYear,
                registeredAccountId: t.registeredAccountId,
              })),
            )
          }

          room = calculateRRSPRoom(currentYear, allTxs, snapshots)
        }

        const beneficiary = account.beneficiaryId ? await ctx.db.get(account.beneficiaryId) : null

        return {
          id: account._id,
          name: account.name,
          accountType: account.accountType,
          owner: account.owner,
          contributor: account.contributor,
          beneficiary: beneficiary
            ? { id: beneficiary._id, name: beneficiary.name, dateOfBirth: beneficiary.dateOfBirth }
            : null,
          room,
        }
      }),
    )

    return results
  },
})

export const getOverContributionPenalties = query({
  args: { accountId: v.id("registeredAccounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId)
    if (!account) return null

    const currentYear = getCurrentYear()
    const snapshots = await getSnapshotsForPerson(ctx, account.contributor, account.accountType)

    if (account.accountType === "TFSA") {
      const rawTxs = await ctx.db
        .query("registeredTransactions")
        .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", accountId))
        .collect()
      const transactions: Transaction[] = rawTxs.map((t) => ({
        type: t.type,
        amount: t.amount,
        date: t.date,
        taxYear: t.taxYear,
        registeredAccountId: t.registeredAccountId,
      }))
      const startYear = account.roomStartYear ?? 2009
      return calculateTFSAPenalties(startYear, currentYear, transactions, snapshots)
    } else {
      // RRSP: all contributions for this contributor
      const allRRSPAccounts = await ctx.db
        .query("registeredAccounts")
        .withIndex("by_contributor", (q) => q.eq("contributor", account.contributor))
        .collect()
      const rrspAccountIds = allRRSPAccounts.filter((a) => a.accountType === "RRSP").map((a) => a._id)

      const allTxs: Transaction[] = []
      for (const id of rrspAccountIds) {
        const txs = await ctx.db
          .query("registeredTransactions")
          .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", id))
          .collect()
        allTxs.push(
          ...txs.map((t) => ({
            type: t.type,
            amount: t.amount,
            date: t.date,
            taxYear: t.taxYear,
            registeredAccountId: t.registeredAccountId,
          })),
        )
      }

      return calculateRRSPPenalties(currentYear, allTxs, snapshots)
    }
  },
})

export const checkNOADiscrepancyQuery = query({
  args: {
    person: personValidator,
    accountType: accountTypeValidator,
    taxYear: v.number(),
  },
  handler: async (ctx, { person, accountType, taxYear }) => {
    if (accountType !== "RRSP") return null

    const snapshot = await ctx.db
      .query("taxYearSnapshots")
      .withIndex("by_person_type_year", (q) => q.eq("person", person).eq("accountType", "RRSP").eq("taxYear", taxYear))
      .first()

    if (!snapshot?.noaDeductionLimit) return null

    // Calculate what room should be for year taxYear+1
    const allSnapshots = await ctx.db
      .query("taxYearSnapshots")
      .withIndex("by_person_type_year", (q) => q.eq("person", person).eq("accountType", "RRSP"))
      .collect()

    const formattedSnapshots: TaxYearSnapshot[] = allSnapshots.map((s) => ({
      person: s.person,
      accountType: s.accountType,
      taxYear: s.taxYear,
      earnedIncome: s.earnedIncome,
      noaDeductionLimit: s.noaDeductionLimit,
      craRoomAsOfJan1: s.craRoomAsOfJan1,
    }))

    // Get all RRSP accounts for this person as contributor
    const accounts = await ctx.db
      .query("registeredAccounts")
      .withIndex("by_contributor", (q) => q.eq("contributor", person))
      .collect()
    const rrspIds = accounts.filter((a) => a.accountType === "RRSP").map((a) => a._id)

    const allTxs: Transaction[] = []
    for (const id of rrspIds) {
      const txs = await ctx.db
        .query("registeredTransactions")
        .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", id))
        .collect()
      allTxs.push(
        ...txs.map((t) => ({
          type: t.type,
          amount: t.amount,
          date: t.date,
          taxYear: t.taxYear,
          registeredAccountId: t.registeredAccountId,
        })),
      )
    }

    // Use earlier NOA snapshots to build a calculated limit
    const priorSnapshots = formattedSnapshots.filter((s) => s.taxYear < taxYear)
    const calcResult = calculateRRSPRoom(taxYear + 1, allTxs, priorSnapshots)

    return checkNOADiscrepancy(snapshot.noaDeductionLimit, calcResult.deductionLimit)
  },
})

export const getSnapshots = query({
  args: { person: personValidator },
  handler: async (ctx, { person }) => {
    const snapshots = await ctx.db
      .query("taxYearSnapshots")
      .withIndex("by_person_type_year", (q) => q.eq("person", person))
      .collect()

    return snapshots
      .sort((a, b) => b.taxYear - a.taxYear || a.accountType.localeCompare(b.accountType))
      .map((s) => ({
        id: s._id,
        person: s.person,
        accountType: s.accountType,
        taxYear: s.taxYear,
        earnedIncome: s.earnedIncome ?? null,
        noaDeductionLimit: s.noaDeductionLimit ?? null,
        craRoomAsOfJan1: s.craRoomAsOfJan1 ?? null,
        notes: s.notes ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
  },
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const seedAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("registeredAccounts").collect()
    if (existing.length > 0) return { seeded: false, message: "Accounts already exist" }

    const now = Date.now()
    const defaults = [
      { name: "My RRSP", accountType: "RRSP" as const, owner: "self" as const, contributor: "self" as const },
      { name: "Spousal RRSP", accountType: "RRSP" as const, owner: "spouse" as const, contributor: "self" as const },
      { name: "Spouse RRSP", accountType: "RRSP" as const, owner: "spouse" as const, contributor: "spouse" as const },
      { name: "My TFSA", accountType: "TFSA" as const, owner: "self" as const, contributor: "self" as const },
      { name: "Spouse TFSA", accountType: "TFSA" as const, owner: "spouse" as const, contributor: "spouse" as const },
    ]

    for (const acct of defaults) {
      await ctx.db.insert("registeredAccounts", {
        ...acct,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { seeded: true, message: "Created 5 default accounts" }
  },
})

export const updateAccount = mutation({
  args: {
    id: v.id("registeredAccounts"),
    name: v.optional(v.string()),
    roomStartYear: v.optional(v.number()),
    beneficiaryId: v.optional(v.id("respBeneficiaries")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const account = await ctx.db.get(id)
    if (!account) throw new Error("Account not found")

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (fields.name !== undefined) updates.name = fields.name
    if (fields.roomStartYear !== undefined) updates.roomStartYear = fields.roomStartYear
    if (fields.beneficiaryId !== undefined) updates.beneficiaryId = fields.beneficiaryId
    if (fields.notes !== undefined) updates.notes = fields.notes

    await ctx.db.patch(id, updates)
  },
})

export const addTransaction = mutation({
  args: {
    registeredAccountId: v.id("registeredAccounts"),
    type: txTypeValidator,
    amount: v.number(),
    date: v.string(),
    taxYear: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.registeredAccountId)
    if (!account) throw new Error("Account not found")
    if (args.amount <= 0) throw new Error("Amount must be positive")

    const now = Date.now()
    return ctx.db.insert("registeredTransactions", {
      registeredAccountId: args.registeredAccountId,
      type: args.type,
      amount: args.amount,
      date: args.date,
      taxYear: args.taxYear,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateTransaction = mutation({
  args: {
    id: v.id("registeredTransactions"),
    type: v.optional(txTypeValidator),
    amount: v.optional(v.number()),
    date: v.optional(v.string()),
    taxYear: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const tx = await ctx.db.get(id)
    if (!tx) throw new Error("Transaction not found")

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (fields.type !== undefined) updates.type = fields.type
    if (fields.amount !== undefined) {
      if (fields.amount <= 0) throw new Error("Amount must be positive")
      updates.amount = fields.amount
    }
    if (fields.date !== undefined) updates.date = fields.date
    if (fields.taxYear !== undefined) updates.taxYear = fields.taxYear
    if (fields.notes !== undefined) updates.notes = fields.notes

    await ctx.db.patch(id, updates)
  },
})

export const deleteTransaction = mutation({
  args: { id: v.id("registeredTransactions") },
  handler: async (ctx, { id }) => {
    const tx = await ctx.db.get(id)
    if (!tx) throw new Error("Transaction not found")
    await ctx.db.delete(id)
  },
})

export const upsertSnapshot = mutation({
  args: {
    person: personValidator,
    accountType: accountTypeValidator,
    taxYear: v.number(),
    earnedIncome: v.optional(v.number()),
    noaDeductionLimit: v.optional(v.number()),
    craRoomAsOfJan1: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("taxYearSnapshots")
      .withIndex("by_person_type_year", (q) =>
        q.eq("person", args.person).eq("accountType", args.accountType).eq("taxYear", args.taxYear),
      )
      .first()

    const now = Date.now()

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now }
      if (args.earnedIncome !== undefined) updates.earnedIncome = args.earnedIncome
      if (args.noaDeductionLimit !== undefined) updates.noaDeductionLimit = args.noaDeductionLimit
      if (args.craRoomAsOfJan1 !== undefined) updates.craRoomAsOfJan1 = args.craRoomAsOfJan1
      if (args.notes !== undefined) updates.notes = args.notes
      await ctx.db.patch(existing._id, updates)
      return existing._id
    } else {
      return ctx.db.insert("taxYearSnapshots", {
        person: args.person,
        accountType: args.accountType,
        taxYear: args.taxYear,
        earnedIncome: args.earnedIncome,
        noaDeductionLimit: args.noaDeductionLimit,
        craRoomAsOfJan1: args.craRoomAsOfJan1,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

export const deleteSnapshot = mutation({
  args: { id: v.id("taxYearSnapshots") },
  handler: async (ctx, { id }) => {
    const snapshot = await ctx.db.get(id)
    if (!snapshot) throw new Error("Snapshot not found")
    await ctx.db.delete(id)
  },
})

export const addAccount = mutation({
  args: {
    name: v.string(),
    accountType: accountTypeValidator,
    owner: personValidator,
    contributor: personValidator,
    beneficiaryId: v.optional(v.id("respBeneficiaries")),
    roomStartYear: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.accountType === "RESP" && !args.beneficiaryId) {
      throw new Error("RESP accounts require a beneficiary")
    }
    const now = Date.now()
    return ctx.db.insert("registeredAccounts", {
      name: args.name,
      accountType: args.accountType,
      owner: args.owner,
      contributor: args.contributor,
      beneficiaryId: args.beneficiaryId,
      roomStartYear: args.roomStartYear,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const deleteAccount = mutation({
  args: { id: v.id("registeredAccounts") },
  handler: async (ctx, { id }) => {
    const account = await ctx.db.get(id)
    if (!account) throw new Error("Account not found")

    // Delete all transactions for this account
    const txs = await ctx.db
      .query("registeredTransactions")
      .withIndex("by_registeredAccountId", (q) => q.eq("registeredAccountId", id))
      .collect()
    for (const tx of txs) {
      await ctx.db.delete(tx._id)
    }

    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// Beneficiary Queries & Mutations
// ---------------------------------------------------------------------------

export const getBeneficiaries = query({
  args: {},
  handler: async (ctx) => {
    const beneficiaries = await ctx.db.query("respBeneficiaries").collect()
    return beneficiaries.map((b) => ({
      id: b._id,
      name: b.name,
      dateOfBirth: b.dateOfBirth,
      notes: b.notes ?? null,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }))
  },
})

export const addBeneficiary = mutation({
  args: {
    name: v.string(),
    dateOfBirth: v.string(), // "YYYY-MM-DD"
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return ctx.db.insert("respBeneficiaries", {
      name: args.name,
      dateOfBirth: args.dateOfBirth,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateBeneficiary = mutation({
  args: {
    id: v.id("respBeneficiaries"),
    name: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const beneficiary = await ctx.db.get(id)
    if (!beneficiary) throw new Error("Beneficiary not found")

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (fields.name !== undefined) updates.name = fields.name
    if (fields.dateOfBirth !== undefined) updates.dateOfBirth = fields.dateOfBirth
    if (fields.notes !== undefined) updates.notes = fields.notes

    await ctx.db.patch(id, updates)
  },
})

export const deleteBeneficiary = mutation({
  args: { id: v.id("respBeneficiaries") },
  handler: async (ctx, { id }) => {
    const beneficiary = await ctx.db.get(id)
    if (!beneficiary) throw new Error("Beneficiary not found")

    // Check no RESP accounts reference this beneficiary
    const linked = await ctx.db
      .query("registeredAccounts")
      .withIndex("by_beneficiaryId", (q) => q.eq("beneficiaryId", id))
      .first()
    if (linked) {
      throw new Error("Cannot delete beneficiary: linked to RESP account '" + linked.name + "'")
    }

    await ctx.db.delete(id)
  },
})

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function getSnapshotsForPerson(
  ctx: QueryCtx,
  person: "self" | "spouse",
  accountType: "RRSP" | "TFSA" | "RESP",
): Promise<TaxYearSnapshot[]> {
  const snapshots = await ctx.db
    .query("taxYearSnapshots")
    .withIndex("by_person_type_year", (q) => q.eq("person", person).eq("accountType", accountType))
    .collect()

  return snapshots.map((s) => ({
    person: s.person,
    accountType: s.accountType,
    taxYear: s.taxYear,
    earnedIncome: s.earnedIncome,
    noaDeductionLimit: s.noaDeductionLimit,
    craRoomAsOfJan1: s.craRoomAsOfJan1,
  }))
}
