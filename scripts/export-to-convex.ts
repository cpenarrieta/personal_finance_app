// scripts/export-to-convex.ts
// Run with: npx tsx scripts/export-to-convex.ts
// Exports all Prisma data to JSON files for Convex import

import "dotenv/config"
import { prisma } from "../src/lib/db/prisma"
import * as fs from "fs"
import * as path from "path"

const EXPORT_DIR = path.join(process.cwd(), "convex-migration-data")

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true })
}

function writeExport(tableName: string, data: unknown[]) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`Exported ${data.length} rows to ${tableName}.json`)
}

async function exportInstitutions() {
  const data = await prisma.institution.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    shortName: row.shortName,
    createdAt: row.createdAt.getTime(),
  }))
  writeExport("institutions", transformed)
  return transformed.length
}

async function exportItems() {
  const data = await prisma.item.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldInstitutionId: row.institutionId,
    plaidItemId: row.plaidItemId,
    accessToken: row.accessToken,
    status: row.status,
    lastTransactionsCursor: row.lastTransactionsCursor,
    lastInvestmentsCursor: row.lastInvestmentsCursor,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("items", transformed)
  return transformed.length
}

async function exportAccounts() {
  const data = await prisma.plaidAccount.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldItemId: row.itemId,
    plaidAccountId: row.plaidAccountId,
    name: row.name,
    officialName: row.officialName,
    mask: row.mask,
    type: row.type,
    subtype: row.subtype,
    currency: row.currency,
    currentBalance: row.currentBalance ? Number(row.currentBalance) : null,
    availableBalance: row.availableBalance ? Number(row.availableBalance) : null,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
    balanceUpdatedAt: row.balanceUpdatedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("accounts", transformed)
  return transformed.length
}

async function exportCategories() {
  const data = await prisma.category.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    groupType: row.groupType,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("categories", transformed)
  return transformed.length
}

async function exportSubcategories() {
  const data = await prisma.subcategory.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldCategoryId: row.categoryId,
    name: row.name,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("subcategories", transformed)
  return transformed.length
}

async function exportTags() {
  const data = await prisma.tag.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("tags", transformed)
  return transformed.length
}

async function exportTransactions() {
  const data = await prisma.transaction.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldAccountId: row.accountId,
    _oldCategoryId: row.categoryId,
    _oldSubcategoryId: row.subcategoryId,
    _oldParentTransactionId: row.parentTransactionId,
    plaidTransactionId: row.plaidTransactionId,
    // Use amount_number which is already converted (amount * -1)
    amount: row.amount_number ?? Number(row.amount) * -1,
    isoCurrencyCode: row.isoCurrencyCode,
    date: row.date.getTime(),
    authorizedDate: row.authorizedDate?.getTime() ?? null,
    datetime: row.datetime,
    authorizedDatetime: row.authorizedDatetime,
    pending: row.pending,
    merchantName: row.merchantName,
    name: row.name,
    plaidCategory: row.plaidCategory,
    plaidSubcategory: row.plaidSubcategory,
    paymentChannel: row.paymentChannel,
    pendingTransactionId: row.pendingTransactionId,
    logoUrl: row.logoUrl,
    categoryIconUrl: row.categoryIconUrl,
    notes: row.notes,
    files: row.files,
    isSplit: row.isSplit,
    isManual: row.isManual,
    originalTransactionId: row.originalTransactionId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("transactions", transformed)
  return transformed.length
}

async function exportTransactionTags() {
  const data = await prisma.transactionTag.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldTransactionId: row.transactionId,
    _oldTagId: row.tagId,
    createdAt: row.createdAt.getTime(),
  }))
  writeExport("transactionTags", transformed)
  return transformed.length
}

async function exportSecurities() {
  const data = await prisma.security.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    plaidSecurityId: row.plaidSecurityId,
    name: row.name,
    tickerSymbol: row.tickerSymbol,
    type: row.type,
    isoCurrencyCode: row.isoCurrencyCode,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("securities", transformed)
  return transformed.length
}

async function exportHoldings() {
  const data = await prisma.holding.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldAccountId: row.accountId,
    _oldSecurityId: row.securityId,
    quantity: row.quantity_number ?? Number(row.quantity),
    costBasis: row.cost_basis_number ?? (row.costBasis ? Number(row.costBasis) : null),
    institutionPrice: row.institution_price_number ?? (row.institutionPrice ? Number(row.institutionPrice) : null),
    institutionPriceAsOf: row.institutionPriceAsOf?.getTime() ?? null,
    isoCurrencyCode: row.isoCurrencyCode,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("holdings", transformed)
  return transformed.length
}

async function exportInvestmentTransactions() {
  const data = await prisma.investmentTransaction.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldAccountId: row.accountId,
    _oldSecurityId: row.securityId,
    plaidInvestmentTransactionId: row.plaidInvestmentTransactionId,
    type: row.type,
    amount: row.amount_number ?? (row.amount ? Number(row.amount) : null),
    price: row.price_number ?? (row.price ? Number(row.price) : null),
    quantity: row.quantity_number ?? (row.quantity ? Number(row.quantity) : null),
    fees: row.fees_number ?? (row.fees ? Number(row.fees) : null),
    isoCurrencyCode: row.isoCurrencyCode,
    date: row.date.getTime(),
    transactionDatetime: row.transactionDatetime,
    name: row.name,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("investmentTransactions", transformed)
  return transformed.length
}

async function exportWeeklySummaries() {
  const data = await prisma.weeklySummary.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    summary: row.summary,
    generatedAt: row.generatedAt.getTime(),
  }))
  writeExport("weeklySummaries", transformed)
  return transformed.length
}

async function exportUsers() {
  const data = await prisma.user.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    email: row.email,
    emailVerified: row.emailVerified,
    name: row.name,
    image: row.image,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("users", transformed)
  return transformed.length
}

async function exportSessions() {
  const data = await prisma.session.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldUserId: row.userId,
    token: row.token,
    expiresAt: row.expiresAt.getTime(),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("sessions", transformed)
  return transformed.length
}

async function exportOAuthAccounts() {
  const data = await prisma.account.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldUserId: row.userId,
    providerId: row.providerId,
    accountId: row.accountId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt?.getTime() ?? null,
    accessTokenExpiresAt: row.accessTokenExpiresAt?.getTime() ?? null,
    refreshTokenExpiresAt: row.refreshTokenExpiresAt?.getTime() ?? null,
    scope: row.scope,
    idToken: row.idToken,
    password: row.password,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("oauthAccounts", transformed)
  return transformed.length
}

async function exportVerifications() {
  const data = await prisma.verification.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    identifier: row.identifier,
    value: row.value,
    expiresAt: row.expiresAt.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("verifications", transformed)
  return transformed.length
}

async function exportPasskeys() {
  const data = await prisma.passkey.findMany()
  const transformed = data.map((row) => ({
    _oldId: row.id,
    _oldUserId: row.userId,
    name: row.name,
    publicKey: row.publicKey,
    credentialID: row.credentialID,
    counter: row.counter,
    deviceType: row.deviceType,
    backedUp: row.backedUp,
    transports: row.transports,
    aaguid: row.aaguid,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }))
  writeExport("passkeys", transformed)
  return transformed.length
}

async function main() {
  console.log("Starting Prisma to Convex export...")
  console.log(`Export directory: ${EXPORT_DIR}`)
  console.log("-----------------------------------")

  const counts: Record<string, number> = {}

  // Export in dependency order
  // 1. Independent tables (no foreign keys)
  counts.institutions = await exportInstitutions()
  counts.categories = await exportCategories()
  counts.tags = await exportTags()
  counts.users = await exportUsers()
  counts.weeklySummaries = await exportWeeklySummaries()
  counts.verifications = await exportVerifications()

  // 2. First-level dependencies
  counts.subcategories = await exportSubcategories()
  counts.items = await exportItems()
  counts.sessions = await exportSessions()
  counts.oauthAccounts = await exportOAuthAccounts()
  counts.passkeys = await exportPasskeys()

  // 3. Second-level dependencies
  counts.accounts = await exportAccounts()
  counts.securities = await exportSecurities()

  // 4. Third-level dependencies
  counts.transactions = await exportTransactions()
  counts.holdings = await exportHoldings()
  counts.investmentTransactions = await exportInvestmentTransactions()

  // 5. Junction tables
  counts.transactionTags = await exportTransactionTags()

  console.log("-----------------------------------")
  console.log("Export complete!")
  console.log("\nExpected counts (save for validation):")

  // Write counts file for validation
  const countsPath = path.join(EXPORT_DIR, "_expected_counts.json")
  fs.writeFileSync(countsPath, JSON.stringify(counts, null, 2))
  console.log(`\nCounts saved to: ${countsPath}`)

  console.log("\nSummary:")
  console.log(JSON.stringify(counts, null, 2))
}

main()
  .catch((error) => {
    console.error("Export failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
