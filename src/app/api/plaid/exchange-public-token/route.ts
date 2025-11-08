import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient } from '@/lib/api/plaid'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { CountryCode } from 'plaid'
import { revalidateTag } from 'next/cache'

export async function POST(req: NextRequest) {
  const { public_token } = await req.json()
  const plaid = getPlaidClient()

  const exchange = await plaid.itemPublicTokenExchange({ public_token })
  const accessToken = exchange.data.access_token
  const itemId = exchange.data.item_id

  // Fetch institution info & accounts
  const item = await plaid.itemGet({ access_token: accessToken })
  const instId = item.data.item.institution_id || 'unknown'
  let institutionName = 'Unknown'
  if (instId && instId !== 'unknown') {
    const inst = await plaid.institutionsGetById({
      institution_id: instId,
      country_codes: [CountryCode.Ca]
    })
    institutionName = inst.data.institution.name
  }

  // Upsert Institution
  const institution = await prisma.institution.upsert({
    where: { id: instId },
    update: { name: institutionName },
    create: { id: instId, name: institutionName },
  })

  // Upsert Item - reset status to null on successful reauth
  const dbItem = await prisma.item.upsert({
    where: { plaidItemId: itemId },
    update: { accessToken, institutionId: institution.id, status: null },
    create: { plaidItemId: itemId, accessToken, institutionId: institution.id, status: null },
  })

  // Accounts
  const accts = await plaid.accountsGet({ access_token: accessToken })
  for (const a of accts.data.accounts) {
    await prisma.plaidAccount.upsert({
      where: { plaidAccountId: a.account_id },
      update: {
        itemId: dbItem.id,
        name: a.name ?? a.official_name ?? 'Account',
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
        name: a.name ?? a.official_name ?? 'Account',
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

  return NextResponse.json({ ok: true })
}
