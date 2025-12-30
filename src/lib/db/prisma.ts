// lib/prisma.ts
// Prisma v7 with adapter pattern for Direct TCP connections
// Note: Prisma Accelerate is still supported if you need caching features

import { PrismaClient } from "@prisma/generated"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required")
  }

  // Check if using Prisma Accelerate (prisma:// or prisma+postgres:// protocol)
  const isAccelerateUrl = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")

  if (isAccelerateUrl) {
    // For Accelerate URLs, you can still use the Accelerate extension if caching is needed.
    // However, Prisma v7 recommends Direct TCP with adapters for non-caching scenarios.
    // If you need caching, keep using @prisma/extension-accelerate with the edge client.
    console.warn(
      "[Prisma] Accelerate URL detected. For non-caching scenarios, consider using a direct database URL with the adapter pattern.",
    )
    // Fallback to adapter with direct connection (user should provide direct DATABASE_URL)
    throw new Error(
      "Prisma v7 requires a direct database URL (postgresql://...) for adapter pattern. " +
        "If using Accelerate for caching, please configure accordingly.",
    )
  }

  // Use Direct TCP with PostgreSQL adapter (recommended for Prisma v7)
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
