"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { InvestmentTransactionList } from "./InvestmentTransactionList"
import { InvestmentTransactionsSkeleton } from "../holdings/HoldingsPortfolioSkeleton"
import type { InvestmentTransactionForClient } from "@/types"

/**
 * Convex wrapper for InvestmentTransactionList
 * Fetches investment transactions via Convex query
 */
export function InvestmentTransactionsConvex() {
  const transactions = useQuery(api.investments.getAllInvestmentTransactions)

  if (transactions === undefined) {
    return <InvestmentTransactionsSkeleton />
  }

  return (
    <InvestmentTransactionList transactions={transactions as InvestmentTransactionForClient[]} showAccount={true} />
  )
}
