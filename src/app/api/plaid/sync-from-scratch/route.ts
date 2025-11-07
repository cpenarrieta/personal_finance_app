import { NextResponse } from "next/server";
import { syncAllItems } from "@/lib/sync/sync";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  // Clear all cursors
  await prisma.item.updateMany({
    data: {
      lastTransactionsCursor: null,
      lastInvestmentsCursor: null,
    },
  });

  // Run full sync
  await syncAllItems();

  return NextResponse.json({ ok: true });
}
