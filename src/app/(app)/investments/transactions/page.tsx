import { getAllInvestmentTransactions } from "@/lib/cached-queries";
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
  const txs = await getAllInvestmentTransactions();
  return (
    <>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Investment Transactions</h1>
        </div>
        <InvestmentTransactionList transactions={txs} showAccount={true} />
      </div>
    </>
  );
}
