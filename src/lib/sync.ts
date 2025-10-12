// lib/sync.ts
import { getPlaidClient } from './plaid'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export async function syncAllItems() {
  const items = await prisma.item.findMany()
  const plaid = getPlaidClient()

  for (const it of items) {
    // 1) Banking transactions
    // First, if no cursor exists, do a historical fetch to get older data
    if (!it.lastTransactionsCursor) {
      const historicalStartDate = '2024-01-01'
      const historicalEndDate = new Date().toISOString().slice(0, 10)

      let offset = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalTransactions: any[] = []

      // Fetch all historical transactions using pagination
      while (true) {
        const historicalResp = await plaid.transactionsGet({
          access_token: it.accessToken,
          start_date: historicalStartDate,
          end_date: historicalEndDate,
          options: {
            count: 500,
            offset: offset,
          },
        })

        totalTransactions.push(...historicalResp.data.transactions)

        if (totalTransactions.length >= historicalResp.data.total_transactions) {
          break
        }
        offset += 500
      }

      // Process historical transactions
      for (const t of totalTransactions) {
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
            logoUrl: t.logo_url || null,
            categoryIconUrl: t.personal_finance_category_icon_url || null,
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
            logoUrl: t.logo_url || null,
            categoryIconUrl: t.personal_finance_category_icon_url || null,
          },
        })
      }
    }

    // Now use /transactions/sync for incremental updates
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
            // Don't update name - preserve user's custom account names
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
            itemId: it.id,
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
            logoUrl: t.logo_url || null,
            categoryIconUrl: t.personal_finance_category_icon_url || null,
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
            logoUrl: t.logo_url || null,
            categoryIconUrl: t.personal_finance_category_icon_url || null,
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
            logoUrl: t.logo_url || null,
            categoryIconUrl: t.personal_finance_category_icon_url || null,
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

    // Holdings
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

    // Update holdings snapshot
    // Delete holdings that are no longer present in Plaid response
    const plaidHoldingKeys = new Set(
      holdingsResp.data.holdings.map(h => `${h.account_id}_${h.security_id}`)
    )
    const existingHoldings = await prisma.holding.findMany({
      where: { accountId: { in: accounts.map(a => a.id) } },
      include: { account: true, security: true }
    })

    for (const existing of existingHoldings) {
      const key = `${existing.account.plaidAccountId}_${existing.security.plaidSecurityId}`
      if (!plaidHoldingKeys.has(key)) {
        await prisma.holding.delete({ where: { id: existing.id } })
      }
    }

    // Upsert holdings from Plaid, preserving custom prices
    for (const h of holdingsResp.data.holdings) {
      const account = accounts.find(a => a.plaidAccountId === h.account_id)
      if (!account) continue

      const security = await prisma.security.findUnique({ where: { plaidSecurityId: h.security_id } })
      if (!security) continue

      // Check if holding already exists with a custom price
      const existingHolding = await prisma.holding.findFirst({
        where: {
          accountId: account.id,
          securityId: security.id
        }
      })

      // Determine which price to use
      let priceToUse = h.institution_price != null ? new Prisma.Decimal(h.institution_price) : null
      let priceAsOfToUse = h.institution_price_as_of ? new Date(h.institution_price_as_of) : null

      // If existing holding has a non-zero price and Plaid's price is 0 or null, preserve the existing price
      if (existingHolding?.institutionPrice && existingHolding.institutionPrice.toNumber() > 0) {
        if (!priceToUse || priceToUse.toNumber() === 0) {
          priceToUse = existingHolding.institutionPrice
          priceAsOfToUse = existingHolding.institutionPriceAsOf
        }
      }

      await prisma.holding.upsert({
        where: {
          id: existingHolding?.id || 'new-holding'
        },
        update: {
          quantity: new Prisma.Decimal(h.quantity),
          costBasis: h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
          institutionPrice: priceToUse,
          institutionPriceAsOf: priceAsOfToUse,
          isoCurrencyCode: h.iso_currency_code || null,
        },
        create: {
          accountId: account.id,
          securityId: security.id,
          quantity: new Prisma.Decimal(h.quantity),
          costBasis: h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
          institutionPrice: priceToUse,
          institutionPriceAsOf: priceAsOfToUse,
          isoCurrencyCode: h.iso_currency_code || null,
        },
      })
    }

    // Investment transactions - fetch from beginning of 2024
    const startDate = '2024-01-01'
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
