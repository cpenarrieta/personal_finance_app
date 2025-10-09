// lib/sync.ts
import { getPlaidClient } from './plaid'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export async function syncAllItems() {
  const items = await prisma.item.findMany()
  const plaid = getPlaidClient()

  for (const it of items) {
    // 1) Banking transactions via /transactions/sync
    let cursor = it.lastTransactionsCursor || undefined
    let hasMore = true

    while (hasMore) {
      const resp = await plaid.transactionsSync({
        access_token: it.accessToken,
        cursor: cursor,
        count: 500,
      })

      // Upsert accounts (in case of new/changed)
      for (const a of resp.data.accounts) {
        await prisma.account.upsert({
          where: { plaidAccountId: a.account_id },
          update: {
            itemId: it.id,
            name: a.name ?? a.official_name ?? 'Account',
            officialName: a.official_name || null,
            mask: a.mask || null,
            type: a.type,
            subtype: a.subtype || null,
            currency: a.balances.iso_currency_code || null,
          },
          create: {
            plaidAccountId: a.account_id,
            itemId: it.id,
            name: a.name ?? a.official_name ?? 'Account',
            officialName: a.official_name || null,
            mask: a.mask || null,
            type: a.type,
            subtype: a.subtype || null,
            currency: a.balances.iso_currency_code || null,
          },
        })
      }

      // Added transactions
      for (const t of resp.data.added) {
        await prisma.transaction.upsert({
          where: { plaidTransactionId: t.transaction_id },
          update: {
            account: { connect: { plaidAccountId: t.account_id } },
            amount: new Prisma.Decimal(t.amount),
            isoCurrencyCode: t.iso_currency_code || null,
            date: new Date(t.date),
            authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
            pending: t.pending,
            merchantName: t.merchant_name || null,
            name: t.name,
            category: t.personal_finance_category?.primary || null,
            subcategory: t.personal_finance_category?.detailed || null,
            paymentChannel: t.payment_channel || null,
            pendingTransactionId: t.pending_transaction_id || null,
          },
          create: {
            plaidTransactionId: t.transaction_id,
            account: { connect: { plaidAccountId: t.account_id } },
            amount: new Prisma.Decimal(t.amount),
            isoCurrencyCode: t.iso_currency_code || null,
            date: new Date(t.date),
            authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
            pending: t.pending,
            merchantName: t.merchant_name || null,
            name: t.name,
            category: t.personal_finance_category?.primary || null,
            subcategory: t.personal_finance_category?.detailed || null,
            paymentChannel: t.payment_channel || null,
            pendingTransactionId: t.pending_transaction_id || null,
          },
        })
      }

      // Modified transactions (e.g., pending -> posted)
      for (const t of resp.data.modified) {
        await prisma.transaction.update({
          where: { plaidTransactionId: t.transaction_id },
          data: {
            amount: new Prisma.Decimal(t.amount),
            isoCurrencyCode: t.iso_currency_code || null,
            date: new Date(t.date),
            authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
            pending: t.pending,
            merchantName: t.merchant_name || null,
            name: t.name,
            category: t.personal_finance_category?.primary || null,
            subcategory: t.personal_finance_category?.detailed || null,
            paymentChannel: t.payment_channel || null,
            pendingTransactionId: t.pending_transaction_id || null,
          },
        })
      }

      // Removed transactions
      const removedIds = resp.data.removed.map(r => r.transaction_id)
      if (removedIds.length) {
        await prisma.transaction.deleteMany({ where: { plaidTransactionId: { in: removedIds } } })
      }

      cursor = resp.data.next_cursor
      hasMore = resp.data.has_more
    }

    await prisma.item.update({ where: { id: it.id }, data: { lastTransactionsCursor: cursor } })

    // 2) Investments: transactions + holdings + securities
    const accounts = await prisma.account.findMany({ where: { itemId: it.id } })

    // Holdings (current snapshot)
    const holdingsResp = await plaid.investmentsHoldingsGet({ access_token: it.accessToken })

    // Securities
    for (const s of holdingsResp.data.securities) {
      await prisma.security.upsert({
        where: { plaidSecurityId: s.security_id },
        update: {
          name: s.name || null,
          tickerSymbol: s.ticker_symbol || null,
          type: s.type || null,
          isoCurrencyCode: s.iso_currency_code || null,
        },
        create: {
          plaidSecurityId: s.security_id,
          name: s.name || null,
          tickerSymbol: s.ticker_symbol || null,
          type: s.type || null,
          isoCurrencyCode: s.iso_currency_code || null,
        },
      })
    }

    // Replace holdings snapshot: simple approach for local use
    for (const acct of accounts) {
      await prisma.holding.deleteMany({ where: { accountId: acct.id } })
    }
    for (const h of holdingsResp.data.holdings) {
      const account = accounts.find(a => a.plaidAccountId === h.account_id)
      if (!account) continue
      await prisma.holding.create({
        data: {
          accountId: account.id,
          securityId: (await prisma.security.findUnique({ where: { plaidSecurityId: h.security_id } }))!.id,
          quantity: new Prisma.Decimal(h.quantity),
          costBasis: h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
          institutionPrice: h.institution_price != null ? new Prisma.Decimal(h.institution_price) : null,
          institutionPriceAsOf: h.institution_price_as_of ? new Date(h.institution_price_as_of) : null,
          isoCurrencyCode: h.iso_currency_code || null,
        },
      })
    }

    // Investment transactions - fetch last 365 days
    const startDate = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const endDate = new Date().toISOString().slice(0, 10)

    const invTxResp = await plaid.investmentsTransactionsGet({
      access_token: it.accessToken,
      start_date: startDate,
      end_date: endDate,
    })

    for (const t of invTxResp.data.investment_transactions) {
      const account = accounts.find(a => a.plaidAccountId === t.account_id)
      if (!account) continue

      const securityId = t.security_id
        ? (await prisma.security.findUnique({ where: { plaidSecurityId: t.security_id } }))?.id
        : null

      await prisma.investmentTransaction.upsert({
        where: { plaidInvestmentTransactionId: t.investment_transaction_id },
        update: {
          accountId: account.id,
          securityId: securityId || null,
          type: t.type,
          amount: t.amount != null ? new Prisma.Decimal(t.amount) : null,
          price: t.price != null ? new Prisma.Decimal(t.price) : null,
          quantity: t.quantity != null ? new Prisma.Decimal(t.quantity) : null,
          fees: t.fees != null ? new Prisma.Decimal(t.fees) : null,
          isoCurrencyCode: t.iso_currency_code || null,
          date: new Date(t.date),
          name: t.name || null,
        },
        create: {
          plaidInvestmentTransactionId: t.investment_transaction_id,
          accountId: account.id,
          securityId: securityId || null,
          type: t.type,
          amount: t.amount != null ? new Prisma.Decimal(t.amount) : null,
          price: t.price != null ? new Prisma.Decimal(t.price) : null,
          quantity: t.quantity != null ? new Prisma.Decimal(t.quantity) : null,
          fees: t.fees != null ? new Prisma.Decimal(t.fees) : null,
          isoCurrencyCode: t.iso_currency_code || null,
          date: new Date(t.date),
          name: t.name || null,
        },
      })
    }
  }
}
