import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InvestmentTransactionList } from "@/components/InvestmentTransactionList";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investment Transactions',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InvTxPage() {
  const txs = await prisma.investmentTransaction.findMany({
    orderBy: { date: "desc" },
    include: { account: true, security: true },
  });
  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/" className="text-primary hover:underline">
          ← Back to Home
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Investment Transactions</h2>
      <InvestmentTransactionList transactions={txs} showAccount={true} />
    </div>
  );
}
