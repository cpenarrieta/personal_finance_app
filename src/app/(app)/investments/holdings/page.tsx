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
  const allHoldings = await getAllHoldings();

  // Map to the select structure expected by HoldingsPortfolio
  const holdings = allHoldings.map((h: (typeof allHoldings)[number]) => ({
    id: h.id,
    accountId: h.accountId,
    securityId: h.securityId,
    quantity_number: h.quantity.toNumber(),
    cost_basis_number: h.costBasis ? h.costBasis.toNumber() : null,
    institution_price_number: h.institutionPrice ? h.institutionPrice.toNumber() : null,
    institution_price_as_of_string: h.institutionPriceAsOf ? h.institutionPriceAsOf.toISOString() : null,
    isoCurrencyCode: h.isoCurrencyCode,
    created_at_string: h.createdAt.toISOString(),
    updated_at_string: h.updatedAt.toISOString(),
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
