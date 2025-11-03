import { prisma } from "@/lib/prisma";
import { InvestmentTransactionList } from "@/components/InvestmentTransactionList";
import type { Metadata } from 'next';
import { AppShell } from "@/components/AppShell";

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
    <AppShell
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Investments" },
        { label: "Transactions" },
      ]}
    >
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
        </div>
        <InvestmentTransactionList transactions={txs} showAccount={true} />
      </div>
    </AppShell>
  );
}
