import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function InvTxPage() {
  const txs = await prisma.investmentTransaction.findMany({
    orderBy: { date: "desc" },
    include: { account: true, security: true },
  });
  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Investment Transactions</h2>
      {txs.length === 0 ? (
        <p className="text-gray-500">
          No investment transactions found. Connect your bank and run sync.
        </p>
      ) : (
        <ul className="space-y-2">
          {txs.map((t) => (
            <li key={t.id} className="border p-3 rounded">
              <div className="font-medium">
                {t.type} — {t.quantity?.toString()} @ {t.price?.toString()}{" "}
                {t.isoCurrencyCode}
              </div>
              <div className="text-sm text-gray-600">
                {t.date.toISOString().slice(0, 10)} · {t.account.name} ·{" "}
                {t.security?.tickerSymbol || t.security?.name || "N/A"}
              </div>
              {t.amount && (
                <div className="text-sm">
                  Amount: {t.amount.toString()} {t.isoCurrencyCode}
                </div>
              )}
              {t.name && <div className="text-sm text-gray-500">{t.name}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
