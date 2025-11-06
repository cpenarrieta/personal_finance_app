import { syncStockPrices } from "@/lib/syncPrices";
import { syncHoldingsLogos } from "@/lib/syncHoldingsLogos";
import { revalidatePath, revalidateTag } from "next/cache";
import { SyncPricesButton } from "@/components/SyncPricesButton";
import { SyncHoldingsLogosButton } from "@/components/SyncHoldingsLogosButton";
import { HoldingsPortfolio } from "@/components/HoldingsPortfolio";
import type { Metadata } from "next";
import { getAllHoldings } from "@/lib/cached-queries";

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
  revalidateTag("holdings", "max");
  revalidateTag("dashboard", "max");
}

async function doSyncHoldingsLogos() {
  "use server";
  await syncHoldingsLogos();
  revalidatePath("/investments/holdings");
  revalidateTag("holdings", "max");
}

export default async function HoldingsPage() {
  const holdings = await getAllHoldings();

  return (
    <>
      <div className="overflow-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Investment Holdings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track your portfolio performance and allocation
            </p>
          </div>
          <div className="flex gap-2">
            <SyncPricesButton action={doSyncPrices} />
            <SyncHoldingsLogosButton action={doSyncHoldingsLogos} />
          </div>
        </div>

        <HoldingsPortfolio holdings={holdings} />
      </div>
    </>
  );
}
