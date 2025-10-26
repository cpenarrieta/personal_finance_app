import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { syncStockPrices } from "@/lib/syncPrices";
import { syncHoldingsLogos } from "@/lib/syncHoldingsLogos";
import { revalidatePath } from "next/cache";
import { SyncPricesButton } from "@/components/SyncPricesButton";
import { SyncHoldingsLogosButton } from "@/components/SyncHoldingsLogosButton";
import { HoldingsPortfolio } from "@/components/HoldingsPortfolio";
import type { Metadata } from "next";
import { HoldingWithRelations } from "@/types";

export const metadata: Metadata = {
  title: "Investment Holdings",
  robots: {
    index: false,
    follow: false,
  },
};

async function doSyncPrices() {
  "use server";
  await syncStockPrices();
  revalidatePath("/investments/holdings");
}

async function doSyncHoldingsLogos() {
  "use server";
  await syncHoldingsLogos();
  revalidatePath("/investments/holdings");
}

export default async function HoldingsPage() {
  const holdings = (await prisma.holding.findMany({
    include: { account: true, security: true },
  })) as HoldingWithRelations[];

  // Serialize holdings for client component
  const serializedHoldings = holdings.map((h) => ({
    id: h.id,
    accountId: h.accountId,
    securityId: h.securityId,
    quantity: h.quantity.toString(),
    costBasis: h.costBasis?.toString() || null,
    institutionPrice: h.institutionPrice?.toString() || null,
    institutionPriceAsOf: h.institutionPriceAsOf?.toISOString() || null,
    isoCurrencyCode: h.isoCurrencyCode,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
    account: {
      id: h.account.id,
      name: h.account.name,
      type: h.account.type,
      subtype: h.account.subtype,
    },
    security: {
      id: h.security.id,
      name: h.security.name,
      tickerSymbol: h.security.tickerSymbol,
      type: h.security.type,
      isoCurrencyCode: h.security.isoCurrencyCode,
      logoUrl: h.security.logoUrl,
    },
  }));

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <div className="flex gap-2">
          <SyncPricesButton action={doSyncPrices} />
          <SyncHoldingsLogosButton action={doSyncHoldingsLogos} />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Investment Holdings
        </h1>
        <p className="text-gray-600 mt-1">
          Track your portfolio performance and allocation
        </p>
      </div>

      <HoldingsPortfolio holdings={serializedHoldings} />
    </div>
  );
}
