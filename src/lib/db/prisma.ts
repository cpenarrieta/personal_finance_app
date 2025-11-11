/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
// lib/prisma.ts
const databaseUrl = process.env.DATABASE_URL || ""
const useAccelerate = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")

const globalForPrisma = global as unknown as { prisma: any }

let prismaInstance: any

if (useAccelerate) {
  // Production: Use Prisma Accelerate
  const { PrismaClient } = require("@prisma/client/edge")
  const { withAccelerate } = require("@prisma/extension-accelerate")
  prismaInstance = new PrismaClient().$extends(withAccelerate())
} else {
  // Local Development: Use standard PrismaClient
  const { PrismaClient } = require("@prisma/client")
  prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma || prismaInstance

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
