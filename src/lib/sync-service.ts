// lib/sync-service.ts
// Modular sync service that can sync transactions and/or investments separately

import { PlaidAccountWithRelations } from "@/types";
import { getPlaidClient } from "./plaid";
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export interface TransactionSyncStats {
  accountsUpdated: number;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
}

export interface InvestmentSyncStats {
  securitiesAdded: number;
  holdingsAdded: number;
  holdingsUpdated: number;
  holdingsRemoved: number;
  investmentTransactionsAdded: number;
}

export interface SyncStats extends TransactionSyncStats, InvestmentSyncStats {}

export interface SyncOptions {
  syncTransactions?: boolean;
  syncInvestments?: boolean;
}

/**
 * Syncs banking transactions for a single item
 */
export async function syncItemTransactions(
  itemId: string,
  accessToken: string,
  lastCursor: string | null
): Promise<{ stats: TransactionSyncStats; newCursor: string }> {
  const plaid = getPlaidClient();
  const stats: TransactionSyncStats = {
    accountsUpdated: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
  };

  // First, if no cursor exists, do a historical fetch to get older data
  if (!lastCursor) {
    console.log("  📅 Fetching historical transactions...");
    const historicalStartDate = "2024-01-01";
    const historicalEndDate = new Date().toISOString().slice(0, 10);

    let offset = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalTransactions: any[] = [];

    // Fetch all historical transactions using pagination
    while (true) {
      const historicalResp = await plaid.transactionsGet({
        access_token: accessToken,
        start_date: historicalStartDate,
        end_date: historicalEndDate,
        options: {
          count: 500,
          offset: offset,
        },
      });

      totalTransactions.push(...historicalResp.data.transactions);

      if (totalTransactions.length >= historicalResp.data.total_transactions) {
        break;
      }
      offset += 500;
    }

    console.log(
      `  ✓ Found ${totalTransactions.length} historical transaction(s)`
    );

    // Process historical transactions
    for (const t of totalTransactions) {
      const existing = await prisma.transaction.findUnique({
        where: { plaidTransactionId: t.transaction_id },
      });
      const isNew = !existing;

      await prisma.transaction.upsert({
        where: { plaidTransactionId: t.transaction_id },
        update: {
          account: { connect: { plaidAccountId: t.account_id } },
          amount: new Prisma.Decimal(t.amount),
          isoCurrencyCode: t.iso_currency_code || null,
          date: new Date(t.date),
          authorizedDate: t.authorized_date
            ? new Date(t.authorized_date)
            : null,
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
          authorizedDate: t.authorized_date
            ? new Date(t.authorized_date)
            : null,
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
      });

      if (isNew) {
        stats.transactionsAdded++;
        console.log(
          `    ➕ ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`
        );
      }
    }
    console.log(`  ✓ Processed ${stats.transactionsAdded} new transaction(s)`);
  }

  // Now use /transactions/sync for incremental updates
  console.log("  🔄 Syncing incremental updates...");
  let cursor = lastCursor || undefined;
  let hasMore = true;

  while (hasMore) {
    const resp = await plaid.transactionsSync({
      access_token: accessToken,
      cursor: cursor,
      count: 500,
    });

    // Upsert accounts (in case of new/changed)
    for (const a of resp.data.accounts) {
      stats.accountsUpdated++;
      await prisma.plaidAccount.upsert({
        where: { plaidAccountId: a.account_id },
        update: {
          itemId: itemId,
          // Don't update name - preserve user's custom account names
          officialName: a.official_name || null,
          mask: a.mask || null,
          type: a.type,
          subtype: a.subtype || null,
          currency: a.balances.iso_currency_code || null,
          currentBalance:
            a.balances.current != null
              ? new Prisma.Decimal(a.balances.current)
              : null,
          availableBalance:
            a.balances.available != null
              ? new Prisma.Decimal(a.balances.available)
              : null,
          creditLimit:
            a.balances.limit != null
              ? new Prisma.Decimal(a.balances.limit)
              : null,
          balanceUpdatedAt: new Date(),
        },
        create: {
          plaidAccountId: a.account_id,
          itemId: itemId,
          name: a.name ?? a.official_name ?? "Account",
          officialName: a.official_name || null,
          mask: a.mask || null,
          type: a.type,
          subtype: a.subtype || null,
          currency: a.balances.iso_currency_code || null,
          currentBalance:
            a.balances.current != null
              ? new Prisma.Decimal(a.balances.current)
              : null,
          availableBalance:
            a.balances.available != null
              ? new Prisma.Decimal(a.balances.available)
              : null,
          creditLimit:
            a.balances.limit != null
              ? new Prisma.Decimal(a.balances.limit)
              : null,
          balanceUpdatedAt: new Date(),
        },
      });
    }

    // Added transactions
    for (const t of resp.data.added) {
      stats.transactionsAdded++;
      await prisma.transaction.upsert({
        where: { plaidTransactionId: t.transaction_id },
        update: {
          account: { connect: { plaidAccountId: t.account_id } },
          amount: new Prisma.Decimal(t.amount),
          isoCurrencyCode: t.iso_currency_code || null,
          date: new Date(t.date),
          authorizedDate: t.authorized_date
            ? new Date(t.authorized_date)
            : null,
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
          authorizedDate: t.authorized_date
            ? new Date(t.authorized_date)
            : null,
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
      });
      console.log(
        `    ➕ ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`
      );
    }

    // Modified transactions (e.g., pending -> posted)
    for (const t of resp.data.modified) {
      stats.transactionsModified++;
      await prisma.transaction.update({
        where: { plaidTransactionId: t.transaction_id },
        data: {
          amount: new Prisma.Decimal(t.amount),
          isoCurrencyCode: t.iso_currency_code || null,
          date: new Date(t.date),
          authorizedDate: t.authorized_date
            ? new Date(t.authorized_date)
            : null,
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
      });
      console.log(
        `    📝 ${t.date} | ${t.name} | $${Math.abs(t.amount).toFixed(2)}`
      );
    }

    // Removed transactions
    const removedIds = resp.data.removed.map((r) => r.transaction_id);
    if (removedIds.length) {
      stats.transactionsRemoved += removedIds.length;
      await prisma.transaction.deleteMany({
        where: { plaidTransactionId: { in: removedIds } },
      });
      console.log(`    🗑️  Removed ${removedIds.length} transaction(s)`);
    }

    cursor = resp.data.next_cursor;
    hasMore = resp.data.has_more;
  }

  return { stats, newCursor: cursor || "" };
}

/**
 * Syncs investments (holdings, securities, investment transactions) for a single item
 */
export async function syncItemInvestments(
  itemId: string,
  accessToken: string
): Promise<InvestmentSyncStats> {
  const plaid = getPlaidClient();
  const stats: InvestmentSyncStats = {
    securitiesAdded: 0,
    holdingsAdded: 0,
    holdingsUpdated: 0,
    holdingsRemoved: 0,
    investmentTransactionsAdded: 0,
  };

  console.log("  📊 Syncing investments...");
  const accounts = (await prisma.plaidAccount.findMany({
    where: { itemId: itemId },
  })) as PlaidAccountWithRelations[];

  // Holdings
  const holdingsResp = await plaid.investmentsHoldingsGet({
    access_token: accessToken,
  });

  // Securities
  for (const s of holdingsResp.data.securities) {
    const existing = await prisma.security.findUnique({
      where: { plaidSecurityId: s.security_id },
    });
    const isNew = !existing;

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
    });

    if (isNew) {
      stats.securitiesAdded++;
      console.log(`    🔐 ${s.ticker_symbol || s.name || "Security"} added`);
    }
  }

  // Update holdings snapshot
  // Delete holdings that are no longer present in Plaid response
  const plaidHoldingKeys = new Set(
    holdingsResp.data.holdings.map((h) => `${h.account_id}_${h.security_id}`)
  );
  const existingHoldings = await prisma.holding.findMany({
    where: { accountId: { in: accounts.map((a) => a.id) } },
    include: { account: true, security: true },
  });

  for (const existing of existingHoldings) {
    const key = `${existing.account.plaidAccountId}_${existing.security.plaidSecurityId}`;
    if (!plaidHoldingKeys.has(key)) {
      stats.holdingsRemoved++;
      await prisma.holding.delete({ where: { id: existing.id } });
      console.log(
        `    🗑️  ${
          existing.security.tickerSymbol || existing.security.name || "Holding"
        } removed`
      );
    }
  }

  // Upsert holdings from Plaid, preserving custom prices
  for (const h of holdingsResp.data.holdings) {
    const account = accounts.find((a) => a.plaidAccountId === h.account_id);
    if (!account) continue;

    const security = await prisma.security.findUnique({
      where: { plaidSecurityId: h.security_id },
    });
    if (!security) continue;

    // Check if holding already exists with a custom price
    const existingHolding = await prisma.holding.findFirst({
      where: {
        accountId: account.id,
        securityId: security.id,
      },
    });

    // Determine which price to use
    let priceToUse =
      h.institution_price != null
        ? new Prisma.Decimal(h.institution_price)
        : null;
    let priceAsOfToUse = h.institution_price_as_of
      ? new Date(h.institution_price_as_of)
      : null;

    // If existing holding has a non-zero price and Plaid's price is 0 or null, preserve the existing price
    if (
      existingHolding?.institutionPrice &&
      existingHolding.institutionPrice.toNumber() > 0
    ) {
      if (!priceToUse || priceToUse.toNumber() === 0) {
        priceToUse = existingHolding.institutionPrice;
        priceAsOfToUse = existingHolding.institutionPriceAsOf;
      }
    }

    const isNewHolding = !existingHolding;

    await prisma.holding.upsert({
      where: {
        id: existingHolding?.id || "new-holding",
      },
      update: {
        quantity: new Prisma.Decimal(h.quantity),
        costBasis:
          h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
        institutionPrice: priceToUse,
        institutionPriceAsOf: priceAsOfToUse,
        isoCurrencyCode: h.iso_currency_code || null,
      },
      create: {
        accountId: account.id,
        securityId: security.id,
        quantity: new Prisma.Decimal(h.quantity),
        costBasis:
          h.cost_basis != null ? new Prisma.Decimal(h.cost_basis) : null,
        institutionPrice: priceToUse,
        institutionPriceAsOf: priceAsOfToUse,
        isoCurrencyCode: h.iso_currency_code || null,
      },
    });

    if (isNewHolding) {
      stats.holdingsAdded++;
      console.log(
        `    📈 ${security.tickerSymbol || security.name || "Holding"} | Qty: ${
          h.quantity
        }`
      );
    } else {
      stats.holdingsUpdated++;
    }
  }

  // Investment transactions - fetch from beginning of 2024
  const startDate = "2024-01-01";
  const endDate = new Date().toISOString().slice(0, 10);

  const invTxResp = await plaid.investmentsTransactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  });

  for (const t of invTxResp.data.investment_transactions) {
    const account = accounts.find((a) => a.plaidAccountId === t.account_id);
    if (!account) continue;

    const securityId = t.security_id
      ? (
          await prisma.security.findUnique({
            where: { plaidSecurityId: t.security_id },
          })
        )?.id
      : null;

    const existing = await prisma.investmentTransaction.findUnique({
      where: { plaidInvestmentTransactionId: t.investment_transaction_id },
    });
    const isNew = !existing;

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
    });

    if (isNew) {
      stats.investmentTransactionsAdded++;
      console.log(
        `    💰 ${t.date} | ${t.type} | ${t.name || "Investment Transaction"}`
      );
    }
  }

  return stats;
}

/**
 * Generic sync function that can sync transactions and/or investments
 */
export async function syncItems(
  options: SyncOptions = { syncTransactions: true, syncInvestments: true }
) {
  const items = await prisma.item.findMany();

  const totalStats: SyncStats = {
    accountsUpdated: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
    securitiesAdded: 0,
    holdingsAdded: 0,
    holdingsUpdated: 0,
    holdingsRemoved: 0,
    investmentTransactionsAdded: 0,
  };

  const syncType =
    options.syncTransactions && options.syncInvestments
      ? "full"
      : options.syncTransactions
      ? "transactions"
      : "investments";

  console.log(
    `\n🔄 Starting ${syncType} sync for ${items.length} item(s)...\n`
  );

  for (const item of items) {
    const itemStats: SyncStats = {
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
      securitiesAdded: 0,
      holdingsAdded: 0,
      holdingsUpdated: 0,
      holdingsRemoved: 0,
      investmentTransactionsAdded: 0,
    };

    const itemInfo = await prisma.item.findUnique({
      where: { id: item.id },
      include: { institution: true },
    });
    const institutionName =
      itemInfo?.institution?.name || "Unknown Institution";
    console.log(`\n📦 Processing: ${institutionName}`);
    console.log("─".repeat(60));

    // Sync transactions if requested
    if (options.syncTransactions) {
      const { stats: txStats, newCursor } = await syncItemTransactions(
        item.id,
        item.accessToken,
        item.lastTransactionsCursor
      );

      Object.assign(itemStats, txStats);

      // Update cursor
      await prisma.item.update({
        where: { id: item.id },
        data: { lastTransactionsCursor: newCursor },
      });
    }

    // Sync investments if requested
    if (options.syncInvestments) {
      const invStats = await syncItemInvestments(item.id, item.accessToken);
      Object.assign(itemStats, invStats);
    }

    // Update total stats
    totalStats.accountsUpdated += itemStats.accountsUpdated;
    totalStats.transactionsAdded += itemStats.transactionsAdded;
    totalStats.transactionsModified += itemStats.transactionsModified;
    totalStats.transactionsRemoved += itemStats.transactionsRemoved;
    totalStats.securitiesAdded += itemStats.securitiesAdded;
    totalStats.holdingsAdded += itemStats.holdingsAdded;
    totalStats.holdingsUpdated += itemStats.holdingsUpdated;
    totalStats.holdingsRemoved += itemStats.holdingsRemoved;
    totalStats.investmentTransactionsAdded +=
      itemStats.investmentTransactionsAdded;

    // Print item summary
    console.log("\n  ✅ Summary for " + institutionName + ":");
    if (options.syncTransactions) {
      console.log(`     • Accounts updated: ${itemStats.accountsUpdated}`);
      console.log(`     • Transactions added: ${itemStats.transactionsAdded}`);
      console.log(
        `     • Transactions modified: ${itemStats.transactionsModified}`
      );
      console.log(
        `     • Transactions removed: ${itemStats.transactionsRemoved}`
      );
    }
    if (options.syncInvestments) {
      console.log(`     • Securities added: ${itemStats.securitiesAdded}`);
      console.log(`     • Holdings added: ${itemStats.holdingsAdded}`);
      console.log(`     • Holdings updated: ${itemStats.holdingsUpdated}`);
      console.log(`     • Holdings removed: ${itemStats.holdingsRemoved}`);
      console.log(
        `     • Investment transactions added: ${itemStats.investmentTransactionsAdded}`
      );
    }
  }

  // Print total summary
  console.log("\n" + "═".repeat(60));
  console.log(`📊 ${syncType.toUpperCase()} SYNC COMPLETE - TOTAL SUMMARY`);
  console.log("═".repeat(60));
  if (options.syncTransactions) {
    console.log(`  Accounts updated: ${totalStats.accountsUpdated}`);
    console.log(`  Transactions added: ${totalStats.transactionsAdded}`);
    console.log(`  Transactions modified: ${totalStats.transactionsModified}`);
    console.log(`  Transactions removed: ${totalStats.transactionsRemoved}`);
  }
  if (options.syncInvestments) {
    console.log(`  Securities added: ${totalStats.securitiesAdded}`);
    console.log(`  Holdings added: ${totalStats.holdingsAdded}`);
    console.log(`  Holdings updated: ${totalStats.holdingsUpdated}`);
    console.log(`  Holdings removed: ${totalStats.holdingsRemoved}`);
    console.log(
      `  Investment transactions added: ${totalStats.investmentTransactionsAdded}`
    );
  }
  console.log("═".repeat(60) + "\n");
}
