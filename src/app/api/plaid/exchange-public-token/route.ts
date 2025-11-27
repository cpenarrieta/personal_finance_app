import { NextRequest, NextResponse } from "next/server"
import { getPlaidClient } from "@/lib/api/plaid"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { CountryCode } from "plaid"
import { revalidateTag, revalidatePath } from "next/cache"
import { logInfo, logWarn } from "@/lib/utils/logger"

export async function POST(req: NextRequest) {
  const { public_token } = await req.json()
  const plaid = getPlaidClient()

  const exchange = await plaid.itemPublicTokenExchange({ public_token })
  const accessToken = exchange.data.access_token
  const itemId = exchange.data.item_id

  // Fetch institution info & accounts
  const item = await plaid.itemGet({ access_token: accessToken })
  const instId = item.data.item.institution_id || "unknown"
  let institutionName = "Unknown"
  if (instId && instId !== "unknown") {
    const inst = await plaid.institutionsGetById({
      institution_id: instId,
      country_codes: [CountryCode.Ca],
    })
    institutionName = inst.data.institution.name
  }

  // Upsert Institution
  const institution = await prisma.institution.upsert({
    where: { id: instId },
    update: { name: institutionName },
    create: { id: instId, name: institutionName },
  })

  // Check for existing item with same institution (reconnection scenario)
  const existingItemForInstitution = await prisma.item.findFirst({
    where: { institutionId: institution.id },
    include: { accounts: true },
  })

  // Get accounts from Plaid
  const accts = await plaid.accountsGet({ access_token: accessToken })

  // If reconnecting (new itemId but same institution), update existing item
  if (existingItemForInstitution && existingItemForInstitution.plaidItemId !== itemId) {
    logInfo(`Reconnection detected for ${institutionName}. Updating existing item...`, {
      institutionName,
      institutionId: institution.id,
      oldItemId: existingItemForInstitution.plaidItemId,
      newItemId: itemId,
    })

    // Check if accounts match (by name + mask)
    const newAccountSignatures = new Set(accts.data.accounts.map((a) => `${a.name}|${a.mask}`))
    const existingAccountSignatures = new Set(
      existingItemForInstitution.accounts.map((a: { name: string; mask: string | null }) => `${a.name}|${a.mask}`),
    )

    const matchingAccounts = [...newAccountSignatures].filter((sig) => existingAccountSignatures.has(sig))

    if (matchingAccounts.length > 0) {
      // Same accounts detected - this is a reconnection
      logWarn(`⚠️  Reconnection: Deleting old transactions (Plaid will assign new IDs)...`, {
        institutionName,
        matchingAccountsCount: matchingAccounts.length,
      })

      // STEP 1: Convert split children to manual (preserve user customizations)
      // This orphans them (removes parent link) before we delete the parent
      const convertedSplits = await prisma.transaction.updateMany({
        where: {
          account: { itemId: existingItemForInstitution.id },
          parentTransactionId: { not: null }, // Is a split child
          isManual: false, // Not already manual
        },
        data: {
          isManual: true, // Mark as manual to preserve
          parentTransactionId: null, // Orphan (parent will be deleted)
        },
      })

      if (convertedSplits.count > 0) {
        logInfo(`   Converted ${convertedSplits.count} split children to manual transactions`, {
          institutionName,
          convertedCount: convertedSplits.count,
        })
      }

      // STEP 2: Delete old Plaid transactions (including split parents)
      const deletedTxs = await prisma.transaction.deleteMany({
        where: {
          account: { itemId: existingItemForInstitution.id },
          isManual: false, // Only delete Plaid-sourced transactions
        },
      })
      logInfo(`   Deleted ${deletedTxs.count} Plaid transactions (preserved manual & split children)`, {
        institutionName,
        deletedCount: deletedTxs.count,
      })

      // Update existing item with new access token and plaidItemId
      // Reset cursors since old cursors are tied to old access token
      await prisma.item.update({
        where: { id: existingItemForInstitution.id },
        data: {
          plaidItemId: itemId,
          accessToken,
          status: null,
          lastTransactionsCursor: null,
          lastInvestmentsCursor: null,
        },
      })

      // Update existing accounts with new plaidAccountIds
      for (const a of accts.data.accounts) {
        const accountSignature = `${a.name}|${a.mask}`
        const existingAccount = existingItemForInstitution.accounts.find(
          (acc: { name: string; mask: string | null }) => `${acc.name}|${acc.mask}` === accountSignature,
        )

        if (existingAccount) {
          // Update existing account with new plaidAccountId
          await prisma.plaidAccount.update({
            where: { id: existingAccount.id },
            data: {
              plaidAccountId: a.account_id,
              officialName: a.official_name || null,
              type: a.type,
              subtype: a.subtype || null,
              currency: a.balances.iso_currency_code || null,
              currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
              availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
              creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
              balanceUpdatedAt: new Date(),
            },
          })
        } else {
          // New account - create it
          await prisma.plaidAccount.create({
            data: {
              plaidAccountId: a.account_id,
              itemId: existingItemForInstitution.id,
              name: a.name ?? a.official_name ?? "Account",
              officialName: a.official_name || null,
              mask: a.mask || null,
              type: a.type,
              subtype: a.subtype || null,
              currency: a.balances.iso_currency_code || null,
              currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
              availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
              creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
              balanceUpdatedAt: new Date(),
            },
          })
        }
      }

      // Invalidate caches
      revalidateTag("accounts", "max")
      revalidateTag("items", "max")
      revalidatePath("/", "layout") // Invalidate Router Cache

      return NextResponse.json({ ok: true, reconnected: true })
    }
  }

  // Normal flow: new institution or no matching accounts
  const dbItem = await prisma.item.upsert({
    where: { plaidItemId: itemId },
    update: { accessToken, institutionId: institution.id, status: null },
    create: { plaidItemId: itemId, accessToken, institutionId: institution.id, status: null },
  })

  // Accounts
  for (const a of accts.data.accounts) {
    await prisma.plaidAccount.upsert({
      where: { plaidAccountId: a.account_id },
      update: {
        itemId: dbItem.id,
        name: a.name ?? a.official_name ?? "Account",
        officialName: a.official_name || null,
        mask: a.mask || null,
        type: a.type,
        subtype: a.subtype || null,
        currency: a.balances.iso_currency_code || null,
        currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
        availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
        creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
        balanceUpdatedAt: new Date(),
      },
      create: {
        plaidAccountId: a.account_id,
        itemId: dbItem.id,
        name: a.name ?? a.official_name ?? "Account",
        officialName: a.official_name || null,
        mask: a.mask || null,
        type: a.type,
        subtype: a.subtype || null,
        currency: a.balances.iso_currency_code || null,
        currentBalance: a.balances.current != null ? new Prisma.Decimal(a.balances.current) : null,
        availableBalance: a.balances.available != null ? new Prisma.Decimal(a.balances.available) : null,
        creditLimit: a.balances.limit != null ? new Prisma.Decimal(a.balances.limit) : null,
        balanceUpdatedAt: new Date(),
      },
    })
  }

  // Invalidate caches so UI updates immediately
  revalidateTag("accounts", "max")
  revalidateTag("items", "max")
  revalidatePath("/", "layout") // Invalidate Router Cache

  return NextResponse.json({ ok: true })
}
