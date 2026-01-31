// lib/sync/sync-prices.ts
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { logInfo, logError } from "../utils/logger"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance()

export async function syncStockPrices() {
  // Get all securities with ticker symbols from Convex
  const securities = await fetchQuery(api.sync.getAllSecuritiesWithTickers)

  logInfo(`Syncing prices for ${securities.length} securities...`)

  const validSecurities = securities.filter((s) => s.tickerSymbol)
  const tickers = validSecurities.map((s) => s.tickerSymbol!)

  if (tickers.length === 0) {
    logInfo("No securities with tickers to sync")
    return
  }

  try {
    // Batch fetch all quotes
    const quotes = await yahooFinance.quote(tickers)

    // Create lookup map
    const priceMap = new Map<string, number>()
    for (const q of quotes) {
      if (q.symbol && q.regularMarketPrice !== undefined) {
        priceMap.set(q.symbol, q.regularMarketPrice)
      }
    }

    const priceDate = Date.now()

    // Update holdings for each security
    for (const security of validSecurities) {
      const price = priceMap.get(security.tickerSymbol!)

      if (price !== undefined) {
        logInfo(`${security.tickerSymbol}: $${price}`)

        await fetchMutation(api.sync.updateHoldingPrices, {
          securityId: security.id,
          institutionPrice: price,
          institutionPriceAsOf: priceDate,
        })
      } else {
        logInfo(`${security.tickerSymbol}: No price data available`)
      }
    }
  } catch (error) {
    logError("Error fetching batch quotes from Yahoo Finance:", error)

    // Fallback: fetch individually with delay
    for (const security of validSecurities) {
      try {
        const quote = await yahooFinance.quote(security.tickerSymbol!)

        if (quote.regularMarketPrice !== undefined) {
          logInfo(`${security.tickerSymbol}: $${quote.regularMarketPrice}`)

          await fetchMutation(api.sync.updateHoldingPrices, {
            securityId: security.id,
            institutionPrice: quote.regularMarketPrice,
            institutionPriceAsOf: Date.now(),
          })
        } else {
          logInfo(`${security.tickerSymbol}: No price data available`)
        }

        // Small delay between individual calls
        await new Promise((r) => setTimeout(r, 500))
      } catch (err) {
        logError(`Error fetching price for ${security.tickerSymbol}:`, err)
      }
    }
  }

  logInfo("Price sync completed!")
}
