"use client"

import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { HoldingsPortfolio } from "./HoldingsPortfolio"
import { HoldingsPortfolioSkeleton } from "./HoldingsPortfolioSkeleton"
import type { HoldingForClient } from "@/types"

/**
 * Convex wrapper for HoldingsPortfolio
 * Fetches holdings via Convex query
 */
export function HoldingsPortfolioConvex() {
  const holdings = useQuery(api.investments.getAllHoldings)

  if (holdings === undefined) {
    return <HoldingsPortfolioSkeleton />
  }

  return <HoldingsPortfolio holdings={holdings as HoldingForClient[]} />
}
