// lib/syncPrices.ts
import { prisma } from "../db/prisma"
import { Prisma } from "@prisma/client"

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || ""

export async function syncStockPrices() {
  // Get all securities with ticker symbols
  const securities = await prisma.security.findMany({
    where: {
      tickerSymbol: { not: null },
    },
  })

  console.log(`Syncing prices for ${securities.length} securities...`)

  for (const security of securities) {
    if (!security.tickerSymbol) continue

    try {
      // Fetch price from Alpha Vantage
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${security.tickerSymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
      )
      const data = await response.json()

      if (data["Global Quote"] && data["Global Quote"]["05. price"]) {
        const price = parseFloat(data["Global Quote"]["05. price"])
        const priceDate = new Date() // Current timestamp

        console.log(`${security.tickerSymbol}: $${price}`)

        // Update all holdings for this security
        await prisma.holding.updateMany({
          where: { securityId: security.id },
          data: {
            institutionPrice: new Prisma.Decimal(price),
            institutionPriceAsOf: priceDate,
          },
        })
      } else {
        console.log(`${security.tickerSymbol}: No price data available`)
      }

      // Add a small delay to respect API rate limits (5 calls per minute for free tier)
      await new Promise((resolve) => setTimeout(resolve, 12000)) // 12 seconds between calls
    } catch (error) {
      console.error(`Error fetching price for ${security.tickerSymbol}:`, error)
    }
  }

  console.log("Price sync completed!")
}
