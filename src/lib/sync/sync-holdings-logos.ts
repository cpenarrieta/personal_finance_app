// lib/sync/sync-holdings-logos.ts
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { logInfo, logError } from "../utils/logger"

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || "pk_A4XxtLBuSvWdGiAYJMzjTA"

export async function syncHoldingsLogos() {
  // Get all securities with ticker symbols from Convex
  const securities = await fetchQuery(api.sync.getAllSecuritiesWithTickers)

  logInfo(`Syncing logos for ${securities.length} securities...`)

  for (const security of securities) {
    if (!security.tickerSymbol) continue

    try {
      const ticker = security.tickerSymbol.toUpperCase()

      // Use logo.dev ticker search - it supports direct ticker lookups!
      const logoUrl = `https://img.logo.dev/ticker/${ticker}?token=${LOGO_DEV_TOKEN}&retina=true`
      logInfo(`${ticker}: ${logoUrl}`)

      // Update the security with the logo URL
      await fetchMutation(api.sync.updateSecurityLogo, {
        id: security.id,
        logoUrl,
      })
    } catch (error) {
      logError(`Error setting logo for ${security.tickerSymbol}:`, error)
    }
  }

  logInfo("Holdings logo sync completed!")
}
