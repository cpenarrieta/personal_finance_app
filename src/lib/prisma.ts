/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Prisma Client with Auto-Serialization
 *
 * This file exports a Prisma client that automatically converts:
 * - Date fields → ISO strings
 * - Decimal fields → numbers
 *
 * This eliminates the need for manual serialization when passing data
 * from server components to client components.
 */

import { serializationExtension } from './prisma-extension'

const databaseUrl = process.env.DATABASE_URL || ''
const useAccelerate = databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://')

const globalForPrisma = global as unknown as { prisma: any }

let prismaInstance: any

if (useAccelerate) {
  // Production: Use Prisma Accelerate + Serialization Extension
  const { PrismaClient } = require('@prisma/client/edge')
  const { withAccelerate } = require('@prisma/extension-accelerate')
  prismaInstance = new PrismaClient()
    .$extends(withAccelerate())
    .$extends(serializationExtension)
} else {
  // Local Development: Use standard PrismaClient + Serialization Extension
  const { PrismaClient } = require('@prisma/client')
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends(serializationExtension)
}

export const prisma = globalForPrisma.prisma || prismaInstance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
