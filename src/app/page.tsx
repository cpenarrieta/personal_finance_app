import Link from "next/link";
import {
  syncAllItems,
  syncTransactionsOnly,
  syncInvestmentsOnly,
} from "@/lib/sync";
import { revalidatePath } from "next/cache";
import { SyncButton } from "@/components/SyncButton";
import { SyncTransactionsButton } from "@/components/SyncTransactionsButton";
import { SyncInvestmentsButton } from "@/components/SyncInvestmentsButton";
import { FreshSyncButton } from "@/components/FreshSyncButton";
import { CategorizeButton } from "@/components/CategorizeButton";
import { LogoutButton } from "@/components/LogoutButton";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import type { Metadata } from "next";
import { Holding, PlaidAccount } from "@prisma/client";

export const metadata: Metadata = {
  title: "Personal Finance Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

async function doSync() {
  "use server";
  await syncAllItems();
  revalidatePath("/", "layout");
}

async function doSyncTransactions() {
  "use server";
  await syncTransactionsOnly();
  revalidatePath("/", "layout");
}

async function doSyncInvestments() {
  "use server";
  await syncInvestmentsOnly();
  revalidatePath("/", "layout");
}

async function doFreshSync() {
  "use server";
  // Clear all cursors
  await prisma.item.updateMany({
    data: {
      lastTransactionsCursor: null,
      lastInvestmentsCursor: null,
    },
  });
  // Run full sync
  await syncAllItems();
  revalidatePath("/", "layout");
}

export default async function Page() {
  // Fetch accounts with balance information
  const accounts = await prisma.plaidAccount.findMany({
    include: { item: { include: { institution: true } } },
    orderBy: { name: "asc" },
  });

  // Fetch holdings for investment value
  const holdings = await prisma.holding.findMany({
    include: { security: true },
  });

  // Calculate total balances
  const totalCurrent = accounts.reduce((sum: number, acc: PlaidAccount) => {
    return sum + (acc.currentBalance?.toNumber() || 0);
  }, 0);

  // Calculate total investment value from holdings
  const totalInvestmentValue = holdings.reduce(
    (sum: number, holding: Holding) => {
      const quantity = holding.quantity.toNumber();
      const price = holding.institutionPrice?.toNumber() || 0;
      return sum + quantity * price;
    },
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Personal Finance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your accounts, track investments, and analyze spending
          </p>
        </div>

        {/* Account Balances Summary */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-primary rounded-lg shadow-lg p-6 text-primary-foreground">
              <div className="text-sm opacity-90 mb-1">
                Total Current Balance
              </div>
              <div className="text-4xl font-bold mb-2">
                $
                {totalCurrent.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm opacity-75">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-lg p-6 text-secondary-foreground">
              <div className="text-sm opacity-90 mb-1">
                Total Investment Value
              </div>
              <div className="text-4xl font-bold mb-2">
                $
                {totalInvestmentValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm opacity-75">
                {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-card rounded-lg shadow-md border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/connect-account">
              <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm transition-colors">
                + Connect New Account
              </button>
            </Link>
            <SyncTransactionsButton action={doSyncTransactions} />
            <SyncInvestmentsButton action={doSyncInvestments} />
            <SyncButton action={doSync} />
            <FreshSyncButton action={doFreshSync} />
            <CategorizeButton />
          </div>
        </div>

        {/* Account Balances Detail */}
        {accounts.length > 0 && (
          <div className="bg-card rounded-lg shadow-md border overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/50">
              <h2 className="text-lg font-semibold text-foreground">
                Account Balances
              </h2>
            </div>
            <div className="divide-y">
              {accounts
                .filter((account: PlaidAccount) => {
                  const currentBal = account.currentBalance?.toNumber() || 0;
                  const availableBal =
                    account.availableBalance?.toNumber() || 0;
                  return currentBal !== 0 || availableBal !== 0;
                })
                .map((account: PlaidAccount) => (
                  <Link
                    key={account.id}
                    href={`/accounts/${account.id}`}
                    className="block px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {account.name}
                          {account.mask && (
                            <span className="text-muted-foreground ml-2">
                              ••{account.mask}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {account.type}
                          {account.subtype ? ` • ${account.subtype}` : ""}
                        </div>
                        {account.balanceUpdatedAt && (
                          <div className="text-xs text-muted-foreground/60 mt-1">
                            Updated{" "}
                            {format(
                              new Date(account.balanceUpdatedAt),
                              "MMM d yyyy h:mm a"
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        {account.currentBalance !== null && (
                          <div className="font-semibold text-foreground">
                            $
                            {account.currentBalance
                              .toNumber()
                              .toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                          </div>
                        )}
                        {account.availableBalance !== null &&
                          account.availableBalance.toNumber() !==
                            account.currentBalance?.toNumber() && (
                            <div className="text-sm text-muted-foreground">
                              Available: $
                              {account.availableBalance
                                .toNumber()
                                .toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                            </div>
                          )}
                        {account.creditLimit !== null && (
                          <div className="text-xs text-muted-foreground">
                            Limit: $
                            {account.creditLimit
                              .toNumber()
                              .toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Banking Section */}
          <div className="bg-card rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-primary text-primary-foreground px-6 py-4">
              <h3 className="text-xl font-semibold">Banking</h3>
              <p className="text-sm opacity-90 mt-1">
                Manage your bank accounts and transactions
              </p>
            </div>
            <div className="p-6 space-y-3">
              <Link
                href="/accounts"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Accounts</div>
                <div className="text-sm text-muted-foreground">
                  View all connected accounts
                </div>
              </Link>
              <Link
                href="/transactions"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Transactions</div>
                <div className="text-sm text-muted-foreground">
                  Browse banking transactions
                </div>
              </Link>
              <Link
                href="/analytics"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Analytics</div>
                <div className="text-sm text-muted-foreground">
                  Spending insights & charts
                </div>
              </Link>
              <Link
                href="/charts"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Charts</div>
                <div className="text-sm text-muted-foreground">
                  Visualize your spending and income patterns
                </div>
              </Link>
            </div>
          </div>

          {/* Investments Section */}
          <div className="bg-card rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-success text-success-foreground px-6 py-4">
              <h3 className="text-xl font-semibold">Investments</h3>
              <p className="text-sm opacity-90 mt-1">
                Track your portfolio and holdings
              </p>
            </div>
            <div className="p-6 space-y-3">
              <Link
                href="/investments/holdings"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Holdings</div>
                <div className="text-sm text-muted-foreground">
                  Portfolio & performance tracking
                </div>
              </Link>
              <Link
                href="/investments/transactions"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Transactions</div>
                <div className="text-sm text-muted-foreground">
                  Investment activity history
                </div>
              </Link>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-card rounded-lg shadow-md border overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-secondary text-secondary-foreground px-6 py-4">
              <h3 className="text-xl font-semibold">Settings</h3>
              <p className="text-sm opacity-90 mt-1">
                Configure categories and preferences
              </p>
            </div>
            <div className="p-6 space-y-3">
              <Link
                href="/settings/manage-categories"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">
                  Manage Categories
                </div>
                <div className="text-sm text-muted-foreground">
                  Customize transaction categories
                </div>
              </Link>

              <Link
                href="/settings/category-order"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Category Order</div>
                <div className="text-sm text-muted-foreground">
                  Organize category dropdown order
                </div>
              </Link>
              <Link
                href="/settings/manage-tags"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">Manage Tags</div>
                <div className="text-sm text-muted-foreground">
                  Organize transactions with custom tags
                </div>
              </Link>
              <Link
                href="/settings/move-transactions"
                className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
              >
                <div className="font-medium text-foreground">
                  Move Transactions
                </div>
                <div className="text-sm text-muted-foreground">
                  Move transactions between categories
                </div>
              </Link>
              <div className="pt-3 mt-3 border-t">
                <LogoutButton variant="destructive" className="w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground"></div>
      </div>
    </div>
  );
}
