import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { syncStockPrices } from "@/lib/syncPrices";
import { syncHoldingsLogos } from "@/lib/syncHoldingsLogos";
import { revalidatePath } from "next/cache";
import { SyncPricesButton } from "@/components/SyncPricesButton";
import { SyncHoldingsLogosButton } from "@/components/SyncHoldingsLogosButton";
import { HoldingsPortfolio } from "@/components/HoldingsPortfolio";
import type { Metadata } from "next";

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
  const holdings = await prisma.holding.findMany({
    select: {
      id: true,
      accountId: true,
      securityId: true,
      quantity_number: true, // Generated column
      cost_basis_number: true, // Generated column
      institution_price_number: true, // Generated column
      institution_price_as_of_string: true, // Generated column
      isoCurrencyCode: true,
      created_at_string: true, // Generated column
      updated_at_string: true, // Generated column
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          subtype: true,
        },
      },
      security: {
        select: {
          id: true,
          name: true,
          tickerSymbol: true,
          type: true,
          isoCurrencyCode: true,
          logoUrl: true,
        },
      },
    },
  });

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-primary hover:underline">
          ← Back to Home
        </Link>
        <div className="flex gap-2">
          <SyncPricesButton action={doSyncPrices} />
          <SyncHoldingsLogosButton action={doSyncHoldingsLogos} />
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Investment Holdings
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your portfolio performance and allocation
        </p>
      </div>

      <HoldingsPortfolio holdings={holdings} />
    </div>
  );
}
