// lib/syncHoldingsLogos.ts
import { prisma } from "../db/prisma"

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || "pk_A4XxtLBuSvWdGiAYJMzjTA"

export async function syncHoldingsLogos() {
  // Get all securities with ticker symbols
  const securities = await prisma.security.findMany({
    where: {
      tickerSymbol: { not: null },
    },
  })

  console.log(`Syncing logos for ${securities.length} securities...`)

  for (const security of securities) {
    if (!security.tickerSymbol) continue

    try {
      const ticker = security.tickerSymbol.toUpperCase()

      // Use logo.dev ticker search - it supports direct ticker lookups!
      const logoUrl = `https://img.logo.dev/ticker/${ticker}?token=${LOGO_DEV_TOKEN}&retina=true`
      console.log(`${ticker}: ${logoUrl}`)

      // Update the security with the logo URL
      await prisma.security.update({
        where: { id: security.id },
        data: { logoUrl },
      })
    } catch (error) {
      console.error(`Error setting logo for ${security.tickerSymbol}:`, error)
    }
  }

  console.log("Holdings logo sync completed!")
}
